import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * PATCH /api/friend-ask/[id]
 * Update a sequential invite (currently only supports cancellation).
 * Body: { status: "cancelled" }
 * Only the creator can cancel.
 */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const { id } = params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION", "Invalid JSON body", 400);
  }

  if (body.status !== "cancelled") {
    return apiError("VALIDATION", "Only status 'cancelled' is supported", 400);
  }

  const { data: friendAsk, error: fetchError } = await supabase
    .from("friend_asks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !friendAsk) {
    return apiError("NOT_FOUND", "Sequential invite not found", 404);
  }

  if (friendAsk.creator_id !== user.id) {
    return apiError("FORBIDDEN", "Only the creator can cancel", 403);
  }

  if (friendAsk.status !== "pending") {
    return apiError(
      "VALIDATION",
      `Cannot cancel: sequential invite status is ${friendAsk.status}`,
      400,
    );
  }

  const { data, error } = await supabase
    .from("friend_asks")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiError("INTERNAL", error.message, 500);

  return apiSuccess({ friend_ask: data });
});
