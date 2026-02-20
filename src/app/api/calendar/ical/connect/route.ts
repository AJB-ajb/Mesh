/**
 * POST /api/calendar/ical/connect
 * Connect an iCal feed URL: validate, create connection, initial sync.
 */

import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { fetchIcalBusyBlocks } from "@/lib/calendar/ical";
import { storeBusyBlocks, updateConnectionSyncStatus } from "@/lib/calendar/sync";

export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await req.json();
  const url = body.url?.trim();

  if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
    return apiError("VALIDATION", "Invalid iCal URL", 400);
  }

  // Create the connection
  const { data: connection, error: insertError } = await supabase
    .from("calendar_connections")
    .insert({
      profile_id: user.id,
      provider: "ical",
      ical_url: url,
      sync_status: "syncing",
    })
    .select("id")
    .single();

  if (insertError) {
    return apiError("INTERNAL", insertError.message, 500);
  }

  // Initial sync
  try {
    const busyBlocks = await fetchIcalBusyBlocks(url);

    // Get user timezone
    const { data: profile } = await supabase
      .from("profiles")
      .select("timezone")
      .eq("user_id", user.id)
      .single();

    const timezone = profile?.timezone ?? "UTC";

    await storeBusyBlocks(
      supabase,
      connection.id,
      user.id,
      busyBlocks,
      timezone,
    );

    await updateConnectionSyncStatus(supabase, connection.id, "synced");

    return apiSuccess({
      connectionId: connection.id,
      blockCount: busyBlocks.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch iCal feed";
    await updateConnectionSyncStatus(
      supabase,
      connection.id,
      "error",
      message,
    );
    return apiError("INTERNAL", `iCal sync failed: ${message}`, 500);
  }
});
