/**
 * DELETE /api/calendar/connections/[id]
 * Disconnect a calendar connection and delete its busy blocks.
 */

import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, apiError } from "@/lib/errors";

export const DELETE = withAuth(async (_req, { user, supabase, params }) => {
  const connectionId = params.id;

  if (!connectionId) {
    return apiError("VALIDATION", "Missing connection ID", 400);
  }

  // Verify the connection belongs to the user
  const { data: connection, error: fetchError } = await supabase
    .from("calendar_connections")
    .select("id, profile_id")
    .eq("id", connectionId)
    .single();

  if (fetchError || !connection) {
    return apiError("NOT_FOUND", "Connection not found", 404);
  }

  if (connection.profile_id !== user.id) {
    return apiError("FORBIDDEN", "Not your connection", 403);
  }

  // Delete busy blocks first (cascade should handle this, but be explicit)
  await supabase
    .from("calendar_busy_blocks")
    .delete()
    .eq("connection_id", connectionId);

  // Delete the connection
  const { error: deleteError } = await supabase
    .from("calendar_connections")
    .delete()
    .eq("id", connectionId);

  if (deleteError) {
    return apiError("INTERNAL", deleteError.message, 500);
  }

  return apiSuccess({ deleted: true });
});
