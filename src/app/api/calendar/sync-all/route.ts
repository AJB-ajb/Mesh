/**
 * POST /api/calendar/sync-all
 * Secret-authenticated batch sync for pg_cron background polling.
 * Syncs all active calendar connections.
 */

import type { NextRequest } from "next/server";
import { apiError, apiSuccess } from "@/lib/errors";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  fetchFreeBusy,
  refreshAccessToken,
  decryptTokens,
} from "@/lib/calendar/google";
import { fetchIcalBusyBlocks } from "@/lib/calendar/ical";
import {
  storeBusyBlocks,
  updateConnectionSyncStatus,
} from "@/lib/calendar/sync";
import type { CalendarConnectionRow } from "@/lib/calendar/types";

async function getUserTimezone(
  supabase: SupabaseClient,
  profileId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", profileId)
    .single();
  return data?.timezone ?? "UTC";
}

async function syncGoogleConnection(
  supabase: SupabaseClient,
  conn: CalendarConnectionRow,
) {
  if (!conn.access_token_encrypted || !conn.refresh_token_encrypted) return;

  await updateConnectionSyncStatus(supabase, conn.id, "syncing");

  const accessTokenBuf = Buffer.from(conn.access_token_encrypted, "base64");
  const refreshTokenBuf = Buffer.from(conn.refresh_token_encrypted, "base64");
  const expiresAt = conn.token_expires_at
    ? new Date(conn.token_expires_at)
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
      .eq("id", conn.id);

    tokens = decryptTokens(
      refreshed.accessTokenEncrypted,
      refreshTokenBuf,
      refreshed.expiresAt,
    );
  }

  const busyBlocks = await fetchFreeBusy(tokens.accessToken);
  const timezone = await getUserTimezone(supabase, conn.profile_id);
  await storeBusyBlocks(
    supabase,
    conn.id,
    conn.profile_id,
    busyBlocks,
    timezone,
  );
  await updateConnectionSyncStatus(supabase, conn.id, "synced");
}

async function syncIcalConnection(
  supabase: SupabaseClient,
  conn: CalendarConnectionRow,
) {
  if (!conn.ical_url) return;

  await updateConnectionSyncStatus(supabase, conn.id, "syncing");

  const busyBlocks = await fetchIcalBusyBlocks(conn.ical_url);
  const timezone = await getUserTimezone(supabase, conn.profile_id);
  await storeBusyBlocks(
    supabase,
    conn.id,
    conn.profile_id,
    busyBlocks,
    timezone,
  );
  await updateConnectionSyncStatus(supabase, conn.id, "synced");
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CALENDAR_SYNC_CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return apiError("UNAUTHORIZED", "Unauthorized", 401);
  }

  const supabase = await createClient();

  const { data: connections, error: fetchError } = await supabase
    .from("calendar_connections")
    .select("*")
    .neq("sync_status", "error");

  if (fetchError || !connections) {
    return apiError("INTERNAL", fetchError?.message ?? "No connections", 500);
  }

  const results: { id: string; status: string; error?: string }[] = [];

  for (const conn of connections as CalendarConnectionRow[]) {
    try {
      if (conn.provider === "google") {
        await syncGoogleConnection(supabase, conn);
        results.push({ id: conn.id, status: "synced" });
      } else if (conn.provider === "ical") {
        await syncIcalConnection(supabase, conn);
        results.push({ id: conn.id, status: "synced" });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await updateConnectionSyncStatus(supabase, conn.id, "error", message);
      results.push({ id: conn.id, status: "error", error: message });
    }
  }

  return apiSuccess({ synced: results.length, results });
}
