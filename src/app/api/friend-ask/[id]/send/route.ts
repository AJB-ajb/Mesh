import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";
import { sendNotification } from "@/lib/notifications/create";

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
      sendNotification(
        {
          userId: friendId,
          type: "sequential_invite",
          title: "Invite Received",
          body: `${senderName} wants you to join "${postingTitle}"`,
          relatedPostingId: friendAsk.posting_id,
          relatedUserId: user.id,
        },
        supabase,
      );
    }
  };

  if (inviteMode === "parallel") {
    // Parallel: notify ALL connections at once
    const declinedSet = new Set(friendAsk.declined_list ?? []);
    const toNotify = friendAsk.ordered_friend_list.filter(
      (id: string) => !declinedSet.has(id),
    );

    await Promise.all(toNotify.map(notifyConnection));

    return apiSuccess({
      friend_ask: friendAsk,
      notified_count: toNotify.length,
    });
  }

  // Sequential: notify up to N connections concurrently (N = concurrent_invites)
  const currentIndex = friendAsk.current_request_index;
  const concurrentInvites = friendAsk.concurrent_invites ?? 1;
  const pendingInvitees: string[] = friendAsk.pending_invitees ?? [];
  const declinedSet = new Set(friendAsk.declined_list ?? []);

  // Calculate how many slots are available
  const slotsAvailable = concurrentInvites - pendingInvitees.length;

  if (slotsAvailable <= 0 && pendingInvitees.length > 0) {
    // Already at capacity — nothing to send
    return apiSuccess({
      friend_ask: friendAsk,
      message: "All concurrent invite slots are filled.",
    });
  }

  // Pick the next slotsAvailable people from the ordered list starting at current_request_index
  // who are NOT already in pending_invitees and NOT in declined_list
  const newInvitees: string[] = [];
  let newIndex = currentIndex;
  for (let i = currentIndex; i < friendAsk.ordered_friend_list.length; i++) {
    if (newInvitees.length >= slotsAvailable) break;
    const candidateId = friendAsk.ordered_friend_list[i];
    if (pendingInvitees.includes(candidateId)) continue;
    if (declinedSet.has(candidateId)) continue;
    newInvitees.push(candidateId);
    newIndex = i + 1;
  }

  if (newInvitees.length === 0 && pendingInvitees.length === 0) {
    // No more people to send to — mark as completed
    const { data, error } = await supabase
      .from("friend_asks")
      .update({ status: "completed" })
      .eq("id", id)
      .select()
      .single();

    if (error) return apiError("INTERNAL", error.message, 500);

    return apiSuccess({
      friend_ask: data,
      message: "All connections have been asked. Sequence completed.",
    });
  }

  // Notify each new invitee
  await Promise.all(newInvitees.map(notifyConnection));

  // Update pending_invitees and current_request_index
  const updatedPendingInvitees = [...pendingInvitees, ...newInvitees];
  const { data, error } = await supabase
    .from("friend_asks")
    .update({
      pending_invitees: updatedPendingInvitees,
      current_request_index: newIndex,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiError("INTERNAL", error.message, 500);

  return apiSuccess({
    friend_ask: data,
    notified: newInvitees,
    notified_count: newInvitees.length,
  });
});
