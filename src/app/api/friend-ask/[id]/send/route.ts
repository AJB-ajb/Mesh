import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";

/**
 * POST /api/friend-ask/[id]/send
 * Advance to the next friend in the sequence (send the next ask).
 * Only the creator can trigger this.
 */
export const POST = withAuth(async (_req, { user, supabase, params }) => {
  const { id } = params;

  const { data: friendAsk, error: fetchError } = await supabase
    .from("friend_asks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !friendAsk) {
    return apiError("NOT_FOUND", "Friend-ask not found", 404);
  }

  if (friendAsk.creator_id !== user.id) {
    return apiError("FORBIDDEN", "Only the creator can send asks", 403);
  }

  if (friendAsk.status !== "pending") {
    return apiError(
      "VALIDATION",
      `Cannot send: friend-ask status is ${friendAsk.status}`,
      400,
    );
  }

  const nextIndex = friendAsk.current_request_index + 1;

  // If we've exhausted the list, mark as completed
  if (nextIndex >= friendAsk.ordered_friend_list.length) {
    const { data, error } = await supabase
      .from("friend_asks")
      .update({ status: "completed" })
      .eq("id", id)
      .select()
      .single();

    if (error) return apiError("INTERNAL", error.message, 500);

    return NextResponse.json({
      friend_ask: data,
      message: "All friends have been asked. Sequence completed.",
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

  // Send friend_request notification to the next friend
  const nextFriendId = friendAsk.ordered_friend_list[nextIndex];

  const [
    { data: recipientProfile },
    { data: senderProfile },
    { data: posting },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("user_id", nextFriendId)
      .single(),
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

  const recipientPrefs =
    recipientProfile?.notification_preferences as NotificationPreferences | null;

  if (shouldNotify(recipientPrefs, "friend_request", "in_app")) {
    const senderName = senderProfile?.full_name || "Someone";
    const postingTitle = posting?.title || "a posting";

    await supabase.from("notifications").insert({
      user_id: nextFriendId,
      type: "friend_request",
      title: "Sequential Invite Received",
      body: `${senderName} wants you to join "${postingTitle}"`,
      related_posting_id: friendAsk.posting_id,
      related_user_id: user.id,
    });
  }

  return NextResponse.json({
    friend_ask: data,
    current_friend_id: nextFriendId,
  });
});
