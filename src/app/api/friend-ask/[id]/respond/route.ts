import { withAuth } from "@/lib/api/with-auth";
import { logFireAndForget } from "@/lib/api/fire-and-forget";
import { notifyIfPreferred } from "@/lib/api/notify-if-preferred";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import {
  INVITE_RECEIVED,
  INVITE_ACCEPTED,
  INVITE_DECLINED,
} from "@/lib/notifications/events";

/**
 * POST /api/friend-ask/[id]/respond
 * Respond to an invite (accept or decline).
 * Body: { action: "accept" | "decline", responses?: object }
 *
 * Sequential mode: only the currently-invited connection can respond.
 * Parallel mode: any connection in the list who hasn't declined can respond.
 *
 * On accept, also creates an application row (status "accepted") so the
 * user appears as a team member via get_posting_team_member_ids().
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const { id } = params;

  const { action, responses } = await parseBody<{
    action?: string;
    responses?: Record<string, unknown>;
  }>(req);

  if (!action || !["accept", "decline"].includes(action)) {
    throw new AppError(
      "VALIDATION",
      "action must be 'accept' or 'decline'",
      400,
    );
  }

  const { data: friendAsk, error: fetchError } = await supabase
    .from("friend_asks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !friendAsk) {
    throw new AppError("NOT_FOUND", "Invite not found", 404);
  }

  if (friendAsk.status !== "pending") {
    throw new AppError(
      "VALIDATION",
      `Cannot respond: invite status is ${friendAsk.status}`,
      400,
    );
  }

  const inviteMode = friendAsk.invite_mode ?? "sequential";

  // --- Auth check ---
  if (inviteMode === "sequential") {
    // Sequential: user must be in pending_invitees
    const pendingInvitees: string[] = friendAsk.pending_invitees ?? [];
    if (!pendingInvitees.includes(user.id)) {
      throw new AppError(
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
      throw new AppError(
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
  const notifyCreator = (title: string, body: string) => {
    logFireAndForget(
      notifyIfPreferred(supabase, friendAsk.creator_id, "sequential_invite", {
        userId: friendAsk.creator_id,
        type: "sequential_invite",
        title,
        body,
        relatedPostingId: friendAsk.posting_id,
        relatedUserId: user.id,
      }),
      "friend-ask-respond-notify-creator",
    );
  };

  // Helper: send invite notification to a connection
  const notifyFriend = async (friendId: string) => {
    const { data: creatorName } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", friendAsk.creator_id)
      .single();

    logFireAndForget(
      notifyIfPreferred(supabase, friendId, "sequential_invite", {
        userId: friendId,
        type: "sequential_invite",
        title: INVITE_RECEIVED.title,
        body: `${creatorName?.full_name || "Someone"} wants you to join "${postingTitle}"`,
        relatedPostingId: friendAsk.posting_id,
        relatedUserId: friendAsk.creator_id,
      }),
      "friend-ask-respond-notify-friend",
    );
  };

  // Helper: create an application row on accept so the user appears as a team member.
  // Uses upsert to handle the UNIQUE(posting_id, applicant_id) constraint gracefully.
  const createApplicationOnAccept = async () => {
    await supabase.from("applications").upsert(
      {
        posting_id: friendAsk.posting_id,
        applicant_id: user.id,
        status: "accepted",
        ...(responses && typeof responses === "object" ? { responses } : {}),
      },
      { onConflict: "posting_id,applicant_id" },
    );
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

      if (error) throw new AppError("INTERNAL", error.message, 500);
      if (!data)
        throw new AppError(
          "NOT_FOUND",
          "Failed to read back updated invite",
          404,
        );

      await createApplicationOnAccept();

      notifyCreator(
        INVITE_ACCEPTED.title,
        `${responderName} has joined "${postingTitle}"`,
      );

      return apiSuccess({
        friend_ask: data,
        message: "Invite accepted",
      });
    }

    // Sequential accept: set status and clear pending_invitees
    const { data, error } = await supabase
      .from("friend_asks")
      .update({ status: "accepted", pending_invitees: [] })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw new AppError("INTERNAL", error.message, 500);
    if (!data)
      throw new AppError(
        "NOT_FOUND",
        "Failed to read back updated invite",
        404,
      );

    await createApplicationOnAccept();

    notifyCreator(
      INVITE_ACCEPTED.title,
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
  notifyCreator(
    INVITE_DECLINED.title,
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

      if (error) throw new AppError("INTERNAL", error.message, 500);
      if (!data)
        throw new AppError(
          "NOT_FOUND",
          "Failed to read back updated invite",
          404,
        );

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

    if (error) throw new AppError("INTERNAL", error.message, 500);
    if (!data)
      throw new AppError(
        "NOT_FOUND",
        "Failed to read back updated invite",
        404,
      );

    return apiSuccess({
      friend_ask: data,
      message: "Declined. Other connections can still accept.",
    });
  }

  // Sequential decline with backfill logic
  const pendingInvitees: string[] = friendAsk.pending_invitees ?? [];
  const newDeclinedList = [...(friendAsk.declined_list ?? []), user.id];
  const newPendingInvitees = pendingInvitees.filter((id) => id !== user.id);

  // Find a backfill candidate: scan ordered_friend_list starting from current_request_index
  // Skip anyone already in pending_invitees, declined_list (including the decliner)
  const declinedSet = new Set(newDeclinedList);
  const pendingSet = new Set(newPendingInvitees);
  let backfillCandidate: string | null = null;
  let newIndex = friendAsk.current_request_index;

  for (
    let i = friendAsk.current_request_index;
    i < friendAsk.ordered_friend_list.length;
    i++
  ) {
    const candidateId = friendAsk.ordered_friend_list[i];
    if (pendingSet.has(candidateId)) continue;
    if (declinedSet.has(candidateId)) continue;
    backfillCandidate = candidateId;
    // Advance current_request_index to candidate's index + 1 (or keep it if already past)
    newIndex = Math.max(friendAsk.current_request_index, i + 1);
    break;
  }

  if (backfillCandidate) {
    // Add backfill candidate to pending_invitees
    const updatedPendingInvitees = [...newPendingInvitees, backfillCandidate];

    const { data, error } = await supabase
      .from("friend_asks")
      .update({
        declined_list: newDeclinedList,
        pending_invitees: updatedPendingInvitees,
        current_request_index: newIndex,
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw new AppError("INTERNAL", error.message, 500);
    if (!data)
      throw new AppError(
        "NOT_FOUND",
        "Failed to read back updated invite",
        404,
      );

    // Notify the backfill candidate
    await notifyFriend(backfillCandidate);

    return apiSuccess({
      friend_ask: data,
      message: "Declined. Next connection will be asked.",
      next_friend_id: backfillCandidate,
    });
  }

  // No backfill candidate found
  if (newPendingInvitees.length === 0) {
    // No more pending invitees and no backfill — mark as completed
    const { data, error } = await supabase
      .from("friend_asks")
      .update({
        status: "completed",
        declined_list: newDeclinedList,
        pending_invitees: [],
      })
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) throw new AppError("INTERNAL", error.message, 500);
    if (!data)
      throw new AppError(
        "NOT_FOUND",
        "Failed to read back updated invite",
        404,
      );

    return apiSuccess({
      friend_ask: data,
      message:
        "Declined. No more connections in the list — sequence completed.",
    });
  }

  // No backfill candidate but still have pending invitees — just update
  const { data, error } = await supabase
    .from("friend_asks")
    .update({
      declined_list: newDeclinedList,
      pending_invitees: newPendingInvitees,
    })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new AppError("INTERNAL", error.message, 500);
  if (!data)
    throw new AppError("NOT_FOUND", "Failed to read back updated invite", 404);

  return apiSuccess({
    friend_ask: data,
    message: "Declined. Waiting on other pending invitees.",
  });
});
