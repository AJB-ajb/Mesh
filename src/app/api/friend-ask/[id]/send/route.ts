import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";

/**
 * POST /api/friend-ask/[id]/send
 * Send the invite to the current friend in the sequence.
 * Only the creator can trigger this. Does NOT advance the index —
 * the respond route handles advancement on decline.
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

  const currentIndex = friendAsk.current_request_index;

  // If we've exhausted the list, mark as completed
  if (currentIndex >= friendAsk.ordered_friend_list.length) {
    const { data, error } = await supabase
      .from("friend_asks")
      .update({ status: "completed" })
      .eq("id", id)
      .select()
      .single();

    if (error) return apiError("INTERNAL", error.message, 500);

    return NextResponse.json({
      friend_ask: data,
      message: "All connections have been asked. Sequence completed.",
    });
  }

  // Send notification to the current friend
  const currentFriendId = friendAsk.ordered_friend_list[currentIndex];

  const [
    { data: recipientProfile },
    { data: senderProfile },
    { data: posting },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("user_id", currentFriendId)
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

  if (shouldNotify(recipientPrefs, "sequential_invite", "in_app")) {
    const senderName = senderProfile?.full_name || "Someone";
    const postingTitle = posting?.title || "a posting";

    await supabase.from("notifications").insert({
      user_id: currentFriendId,
      type: "sequential_invite",
      title: "Sequential Invite Received",
      body: `${senderName} wants you to join "${postingTitle}"`,
      related_posting_id: friendAsk.posting_id,
      related_user_id: user.id,
    });
  }

  return NextResponse.json({
    friend_ask: friendAsk,
    current_friend_id: currentFriendId,
  });
});
