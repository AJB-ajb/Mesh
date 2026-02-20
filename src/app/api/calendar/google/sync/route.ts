/**
 * POST /api/calendar/google/sync
 * Manual sync trigger for Google Calendar.
 * Fetches FreeBusy data and stores busy blocks.
 */

import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, apiError } from "@/lib/errors";
import {
  fetchFreeBusy,
  refreshAccessToken,
  decryptTokens,
} from "@/lib/calendar/google";
import {
  storeBusyBlocks,
  updateConnectionSyncStatus,
} from "@/lib/calendar/sync";

export const POST = withAuth(async (_req, { user, supabase }) => {
  // Fetch the user's Google calendar connection
  const { data: connection, error: fetchError } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("profile_id", user.id)
    .eq("provider", "google")
    .single();

  if (fetchError || !connection) {
    return apiError("NOT_FOUND", "No Google Calendar connection found", 404);
  }

  if (!connection.access_token_encrypted || !connection.refresh_token_encrypted) {
    return apiError("VALIDATION", "Missing tokens for Google connection", 400);
  }

  await updateConnectionSyncStatus(supabase, connection.id, "syncing");

  try {
    // Decrypt tokens
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

    // Refresh if expired
    if (tokens.expiresAt.getTime() < Date.now() + 60_000) {
      const refreshed = await refreshAccessToken(refreshTokenBuf);

      // Update stored access token
      await supabase
        .from("calendar_connections")
        .update({
          access_token_encrypted: refreshed.accessTokenEncrypted.toString("base64"),
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

    // Fetch free/busy data
    const busyBlocks = await fetchFreeBusy(tokens.accessToken);

    // Get user timezone
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", user.id)
      .single();

    const timezone = profile?.timezone ?? "UTC";

    // Store busy blocks
    await storeBusyBlocks(
      supabase,
      connection.id,
      user.id,
      busyBlocks,
      timezone,
    );

    await updateConnectionSyncStatus(supabase, connection.id, "synced");

    return apiSuccess({
      synced: true,
      blockCount: busyBlocks.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown sync error";
    await updateConnectionSyncStatus(
      supabase,
      connection.id,
      "error",
      message,
    );
    return apiError("INTERNAL", `Sync failed: ${message}`, 500);
  }
});
