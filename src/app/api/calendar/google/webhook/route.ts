/**
 * POST /api/calendar/google/webhook
 * Google Calendar push notification handler.
 * When Google detects changes, it POSTs here. We trigger a sync.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  fetchFreeBusy,
  refreshAccessToken,
  decryptTokens,
} from "@/lib/calendar/google";
import {
  storeBusyBlocks,
  updateConnectionSyncStatus,
} from "@/lib/calendar/sync";

export async function POST(req: NextRequest) {
  // Google sends channel ID and resource ID in headers
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceId = req.headers.get("x-goog-resource-id");

  if (!channelId || !resourceId) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  try {
    const supabase = await createServerClient();

    // Look up connection by watch channel
    const { data: connection, error: fetchError } = await supabase
      .from("calendar_connections")
      .select("*")
      .eq("watch_channel_id", channelId)
      .eq("watch_resource_id", resourceId)
      .single();

    if (fetchError || !connection) {
      // Channel may have been removed — acknowledge anyway
      return NextResponse.json({ ok: true });
    }

    if (
      !connection.access_token_encrypted ||
      !connection.refresh_token_encrypted
    ) {
      return NextResponse.json({ ok: true });
    }

    await updateConnectionSyncStatus(supabase, connection.id, "syncing");

    // Decrypt and possibly refresh tokens
    const accessTokenBuf = Buffer.from(
      connection.access_token_encrypted,
      "base64",
    );
    const refreshTokenBuf = Buffer.from(
      connection.refresh_token_encrypted,
      "base64",
    );
    const expiresAt = connection.token_expires_at
      ? new Date(connection.token_expires_at)
      : new Date(0);

    let tokens = decryptTokens(accessTokenBuf, refreshTokenBuf, expiresAt);

    if (tokens.expiresAt.getTime() < Date.now() + 60_000) {
      const refreshed = await refreshAccessToken(refreshTokenBuf);
      await supabase
        .from("calendar_connections")
        .update({
          access_token_encrypted:
            refreshed.accessTokenEncrypted.toString("base64"),
          token_expires_at: refreshed.expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id);

      tokens = decryptTokens(
        refreshed.accessTokenEncrypted,
        refreshTokenBuf,
        refreshed.expiresAt,
      );
    }

    const busyBlocks = await fetchFreeBusy(tokens.accessToken);

    // Get user timezone
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", connection.profile_id)
      .single();

    const timezone = profile?.timezone ?? "UTC";

    await storeBusyBlocks(
      supabase,
      connection.id,
      connection.profile_id,
      busyBlocks,
      timezone,
    );

    await updateConnectionSyncStatus(supabase, connection.id, "synced");
  } catch (error) {
    console.error("Google webhook sync error:", error);
    // Still return 200 to acknowledge the notification
  }

  return NextResponse.json({ ok: true });
}
