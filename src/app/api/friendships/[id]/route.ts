import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess, parseBody } from "@/lib/errors";

/**
 * PATCH /api/friendships/[id]
 * Update connection status (accept, decline, block).
 * Body: { status: "accepted" | "declined" | "blocked" }
 */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const { id } = params;

  const { status } = await parseBody<{ status?: string }>(req);
  const allowed = ["accepted", "declined", "blocked"];

  if (!status || !allowed.includes(status)) {
    return apiError(
      "VALIDATION",
      `status must be one of: ${allowed.join(", ")}`,
      400,
    );
  }

  // Verify the connection exists and the user is a participant
  const { data: friendship, error: fetchError } = await supabase
    .from("friendships")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !friendship) {
    return apiError("NOT_FOUND", "Connection not found", 404);
  }

  // Only participants can update
  if (friendship.user_id !== user.id && friendship.friend_id !== user.id) {
    return apiError("FORBIDDEN", "Not a participant in this connection", 403);
  }

  // Only the recipient (friend_id) can accept/decline
  if (
    (status === "accepted" || status === "declined") &&
    friendship.friend_id !== user.id
  ) {
    return apiError(
      "FORBIDDEN",
      "Only the recipient can accept or decline",
      403,
    );
  }

  const { data, error } = await supabase
    .from("friendships")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiError("INTERNAL", error.message, 500);

  // On accept, auto-create a 2-person DM space
  if (status === "accepted") {
    const user1 = friendship.user_id;
    const user2 = friendship.friend_id;

    const { data: dmSpace, error: spaceError } = await supabase
      .from("spaces")
      .insert({
        name: null,
        created_by: user2, // recipient creates it
        settings: { visibility: "private" },
      })
      .select()
      .single();

    if (spaceError) {
      console.error("Failed to create DM space:", spaceError.message);
    } else {
      // Add both users as admins
      await supabase.from("space_members").insert([
        { space_id: dmSpace.id, user_id: user1, role: "admin" },
        { space_id: dmSpace.id, user_id: user2, role: "admin" },
      ]);
    }
  }

  return apiSuccess({ friendship: data });
});

/**
 * DELETE /api/friendships/[id]
 * Remove a connection. Only the initiator (user_id) can delete.
 */
export const DELETE = withAuth(async (_req, { user, supabase, params }) => {
  const { id } = params;

  // Verify the connection exists and the user is the initiator
  const { data: friendship, error: fetchError } = await supabase
    .from("friendships")
    .select("user_id")
    .eq("id", id)
    .single();

  if (fetchError || !friendship) {
    return apiError("NOT_FOUND", "Connection not found", 404);
  }

  if (friendship.user_id !== user.id) {
    return apiError(
      "FORBIDDEN",
      "Only the initiator can delete a connection",
      403,
    );
  }

  const { error } = await supabase.from("friendships").delete().eq("id", id);

  if (error) return apiError("INTERNAL", error.message, 500);

  return apiSuccess({ success: true });
});
