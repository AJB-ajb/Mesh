import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";

/**
 * POST /api/friend-ask/[id]/send
 * Send the invite notification(s).
 * - Sequential mode: notifies the current connection in the sequence.
 * - Parallel mode: notifies ALL connections at once.
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
    return apiError("NOT_FOUND", "Invite not found", 404);
  }

  if (friendAsk.creator_id !== user.id) {
    return apiError("FORBIDDEN", "Only the creator can send asks", 403);
  }

  if (friendAsk.status !== "pending") {
    return apiError(
      "VALIDATION",
      `Cannot send: invite status is ${friendAsk.status}`,
      400,
    );
  }

  const inviteMode = friendAsk.invite_mode ?? "sequential";

  // Fetch sender profile and posting title (needed for all modes)
  const [{ data: senderProfile }, { data: posting }] = await Promise.all([
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

  const senderName = senderProfile?.full_name || "Someone";
  const postingTitle = posting?.title || "a posting";

  // Helper to notify a single connection
  const notifyConnection = async (friendId: string) => {
    const { data: recipientProfile } = await supabase
      .from("profiles")
      .select("notification_preferences")
      .eq("user_id", friendId)
      .single();

    const recipientPrefs =
      recipientProfile?.notification_preferences as NotificationPreferences | null;

    if (shouldNotify(recipientPrefs, "sequential_invite", "in_app")) {
      await supabase.from("notifications").insert({
        user_id: friendId,
        type: "sequential_invite",
        title: "Invite Received",
        body: `${senderName} wants you to join "${postingTitle}"`,
        related_posting_id: friendAsk.posting_id,
        related_user_id: user.id,
      });
    }
  };

  if (inviteMode === "parallel") {
    // Parallel: notify ALL connections at once
    const declinedSet = new Set(friendAsk.declined_list ?? []);
    const toNotify = friendAsk.ordered_friend_list.filter(
      (id: string) => !declinedSet.has(id),
    );

    await Promise.all(toNotify.map(notifyConnection));

    return NextResponse.json({
      friend_ask: friendAsk,
      notified_count: toNotify.length,
    });
  }

  // Sequential: notify only the current connection
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

  const currentFriendId = friendAsk.ordered_friend_list[currentIndex];
  await notifyConnection(currentFriendId);

  return NextResponse.json({
    friend_ask: friendAsk,
    current_friend_id: currentFriendId,
  });
});
