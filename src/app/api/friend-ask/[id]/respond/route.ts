import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess, parseBody } from "@/lib/errors";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";
import { sendNotification } from "@/lib/notifications/create";

/**
 * POST /api/friend-ask/[id]/respond
 * Respond to an invite (accept or decline).
 * Body: { action: "accept" | "decline" }
 *
 * Sequential mode: only the currently-invited connection can respond.
 * Parallel mode: any connection in the list who hasn't declined can respond.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const { id } = params;

  const { action } = await parseBody<{ action?: string }>(req);

  if (!action || !["accept", "decline"].includes(action)) {
    return apiError("VALIDATION", "action must be 'accept' or 'decline'", 400);
  }

  const { data: friendAsk, error: fetchError } = await supabase
    .from("friend_asks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !friendAsk) {
    return apiError("NOT_FOUND", "Invite not found", 404);
  }

  if (friendAsk.status !== "pending") {
    return apiError(
      "VALIDATION",
      `Cannot respond: invite status is ${friendAsk.status}`,
      400,
    );
  }

  const inviteMode = friendAsk.invite_mode ?? "sequential";

  // --- Auth check ---
  if (inviteMode === "sequential") {
    // Sequential: only the currently-invited connection can respond
    const currentFriendId =
      friendAsk.ordered_friend_list[friendAsk.current_request_index];
    if (user.id !== currentFriendId) {
      return apiError(
        "FORBIDDEN",
        "You are not the currently-invited connection",
        403,
      );
    }
  } else {
    // Parallel: any user in the list who hasn't declined can respond
    const isInList = friendAsk.ordered_friend_list.includes(user.id);
    const hasDeclined = (friendAsk.declined_list ?? []).includes(user.id);
    if (!isInList || hasDeclined) {
      return apiError(
        "FORBIDDEN",
        "You are not eligible to respond to this invite",
        403,
      );
    }
  }

  // Fetch responder profile name and posting title for notifications
  const [{ data: responderProfile }, { data: posting }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("postings")
      .select("title")
      .eq("id", friendAsk.posting_id)
      .single(),
  ]);

  const responderName = responderProfile?.full_name || "Someone";
  const postingTitle = posting?.title || "a posting";

  // Helper: notify the creator
  const notifyCreator = async (title: string, body: string) => {
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("user_id", friendAsk.creator_id)
      .single();

    const creatorPrefs =
      creatorProfile?.notification_preferences as NotificationPreferences | null;

    if (shouldNotify(creatorPrefs, "sequential_invite", "in_app")) {
      sendNotification(
        {
          userId: friendAsk.creator_id,
          type: "sequential_invite",
          title,
          body,
          relatedPostingId: friendAsk.posting_id,
          relatedUserId: user.id,
        },
        supabase,
      );
    }
  };

  // Helper: send invite notification to a connection
  const notifyFriend = async (friendId: string) => {
    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("user_id", friendId)
      .single();

    const recipientPrefs =
      recipientProfile?.notification_preferences as NotificationPreferences | null;

    if (shouldNotify(recipientPrefs, "sequential_invite", "in_app")) {
      const { data: creatorName } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", friendAsk.creator_id)
        .single();

      sendNotification(
        {
          userId: friendId,
          type: "sequential_invite",
          title: "Invite Received",
          body: `${creatorName?.full_name || "Someone"} wants you to join "${postingTitle}"`,
          relatedPostingId: friendAsk.posting_id,
          relatedUserId: friendAsk.creator_id,
        },
        supabase,
      );
    }
  };

  // =========================================================================
  // ACCEPT
  // =========================================================================
  if (action === "accept") {
    if (inviteMode === "parallel") {
      // Parallel: set status accepted, record the acceptor's index
      const acceptorIndex = friendAsk.ordered_friend_list.indexOf(user.id);
      const { data, error } = await supabase
        .from("friend_asks")
        .update({ status: "accepted", current_request_index: acceptorIndex })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) return apiError("INTERNAL", error.message, 500);
      if (!data)
        return apiError("NOT_FOUND", "Failed to read back updated invite", 404);

      await notifyCreator(
        "Invite Accepted!",
        `${responderName} has joined "${postingTitle}"`,
      );

      return apiSuccess({
        friend_ask: data,
        message: "Invite accepted",
      });
    }

    // Sequential accept
    const { data, error } = await supabase
      .from("friend_asks")
      .update({ status: "accepted" })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return apiError("INTERNAL", error.message, 500);
    if (!data)
      return apiError("NOT_FOUND", "Failed to read back updated invite", 404);

    await notifyCreator(
      "Invite Accepted!",
      `${responderName} has joined "${postingTitle}"`,
    );

    return apiSuccess({
      friend_ask: data,
      message: "Invite accepted",
    });
  }

  // =========================================================================
  // DECLINE
  // =========================================================================

  // Notify the creator about the decline
  await notifyCreator(
    "Invite Declined",
    `${responderName} declined the invite for "${postingTitle}"`,
  );

  if (inviteMode === "parallel") {
    // Parallel decline: append to declined_list
    const newDeclinedList = [...(friendAsk.declined_list ?? []), user.id];

    // If all connections declined, mark as completed
    if (newDeclinedList.length >= friendAsk.ordered_friend_list.length) {
      const { data, error } = await supabase
        .from("friend_asks")
        .update({ status: "completed", declined_list: newDeclinedList })
        .eq("id", id)
        .select()
        .maybeSingle();

      if (error) return apiError("INTERNAL", error.message, 500);
      if (!data)
        return apiError("NOT_FOUND", "Failed to read back updated invite", 404);

      return apiSuccess({
        friend_ask: data,
        message: "Declined. All connections have responded — invite completed.",
      });
    }

    const { data, error } = await supabase
      .from("friend_asks")
      .update({ declined_list: newDeclinedList })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return apiError("INTERNAL", error.message, 500);
    if (!data)
      return apiError("NOT_FOUND", "Failed to read back updated invite", 404);

    return apiSuccess({
      friend_ask: data,
      message: "Declined. Other connections can still accept.",
    });
  }

  // Sequential decline: auto-advance to next connection
  const nextIndex = friendAsk.current_request_index + 1;

  if (nextIndex >= friendAsk.ordered_friend_list.length) {
    // No more connections to ask
    const { data, error } = await supabase
      .from("friend_asks")
      .update({ status: "completed", current_request_index: nextIndex })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) return apiError("INTERNAL", error.message, 500);
    if (!data)
      return apiError("NOT_FOUND", "Failed to read back updated invite", 404);

    return apiSuccess({
      friend_ask: data,
      message:
        "Declined. No more connections in the list — sequence completed.",
    });
  }

  // Advance to next connection
  const { data, error } = await supabase
    .from("friend_asks")
    .update({ current_request_index: nextIndex })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) return apiError("INTERNAL", error.message, 500);
  if (!data)
    return apiError("NOT_FOUND", "Failed to read back updated invite", 404);

  // Auto-send invite to the next connection
  const nextFriendId = friendAsk.ordered_friend_list[nextIndex];
  await notifyFriend(nextFriendId);

  return apiSuccess({
    friend_ask: data,
    message: "Declined. Next connection will be asked.",
    next_friend_id: nextFriendId,
  });
});
