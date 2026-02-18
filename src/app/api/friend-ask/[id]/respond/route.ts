import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";

/**
 * POST /api/friend-ask/[id]/respond
 * Respond to a friend-ask (accept or decline).
 * Body: { action: "accept" | "decline" }
 * Only the currently-asked friend can respond.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const { id } = params;

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION", "Invalid JSON body", 400);
  }

  const { action } = body;

  if (!action || !["accept", "decline"].includes(action)) {
    return apiError("VALIDATION", "action must be 'accept' or 'decline'", 400);
  }

  const { data: friendAsk, error: fetchError } = await supabase
    .from("friend_asks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !friendAsk) {
    return apiError("NOT_FOUND", "Friend-ask not found", 404);
  }

  if (friendAsk.status !== "pending") {
    return apiError(
      "VALIDATION",
      `Cannot respond: friend-ask status is ${friendAsk.status}`,
      400,
    );
  }

  // Verify the user is the current friend being asked
  const currentFriendId =
    friendAsk.ordered_friend_list[friendAsk.current_request_index];

  if (user.id !== currentFriendId) {
    return apiError("FORBIDDEN", "You are not the currently-asked friend", 403);
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
      await supabase.from("notifications").insert({
        user_id: friendAsk.creator_id,
        type: "sequential_invite",
        title,
        body,
        related_posting_id: friendAsk.posting_id,
        related_user_id: user.id,
      });
    }
  };

  // Helper: send invite notification to a friend
  const notifyNextFriend = async (friendId: string) => {
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

      await supabase.from("notifications").insert({
        user_id: friendId,
        type: "sequential_invite",
        title: "Sequential Invite Received",
        body: `${creatorName?.full_name || "Someone"} wants you to join "${postingTitle}"`,
        related_posting_id: friendAsk.posting_id,
        related_user_id: friendAsk.creator_id,
      });
    }
  };

  if (action === "accept") {
    const { data, error } = await supabase
      .from("friend_asks")
      .update({ status: "accepted" })
      .eq("id", id)
      .select()
      .single();

    if (error) return apiError("INTERNAL", error.message, 500);

    // Notify the creator
    await notifyCreator(
      "Invite Accepted!",
      `${responderName} has joined "${postingTitle}"`,
    );

    return NextResponse.json({
      friend_ask: data,
      message: "Friend-ask accepted",
    });
  }

  // Decline: auto-advance to next friend
  const nextIndex = friendAsk.current_request_index + 1;

  // Notify the creator about the decline
  await notifyCreator(
    "Invite Declined",
    `${responderName} declined the invite for "${postingTitle}"`,
  );

  if (nextIndex >= friendAsk.ordered_friend_list.length) {
    // No more friends to ask
    const { data, error } = await supabase
      .from("friend_asks")
      .update({ status: "completed", current_request_index: nextIndex })
      .eq("id", id)
      .select()
      .single();

    if (error) return apiError("INTERNAL", error.message, 500);

    return NextResponse.json({
      friend_ask: data,
      message:
        "Declined. No more connections in the list — sequence completed.",
    });
  }

  // Advance to next friend
  const { data, error } = await supabase
    .from("friend_asks")
    .update({ current_request_index: nextIndex })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiError("INTERNAL", error.message, 500);

  // Auto-send invite to the next friend
  const nextFriendId = friendAsk.ordered_friend_list[nextIndex];
  await notifyNextFriend(nextFriendId);

  return NextResponse.json({
    friend_ask: data,
    message: "Declined. Next connection will be asked.",
    next_friend_id: nextFriendId,
  });
});
