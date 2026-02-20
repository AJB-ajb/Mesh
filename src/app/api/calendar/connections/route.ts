/**
 * GET /api/calendar/connections
 * List the authenticated user's calendar connections (no tokens exposed).
 */

import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, apiError } from "@/lib/errors";
import { toCalendarConnection } from "@/lib/calendar/types";
import type { CalendarConnectionRow } from "@/lib/calendar/types";

export const GET = withAuth(async (_req, { user, supabase }) => {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select(
      "id, profile_id, provider, ical_url, last_synced_at, sync_status, sync_error, created_at, updated_at",
    )
    .eq("profile_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    return apiError("INTERNAL", error.message, 500);
  }

  const connections = (data as CalendarConnectionRow[]).map(toCalendarConnection);
  return apiSuccess({ connections });
});
