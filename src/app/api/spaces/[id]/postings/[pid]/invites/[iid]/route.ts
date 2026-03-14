import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import { PG_UNIQUE_VIOLATION } from "@/lib/api/pg-error-codes";
import { respond, advance } from "@/lib/data/space-invites";

/**
 * PATCH /api/spaces/[id]/postings/[pid]/invites/[iid]
 * Respond to an invite (accept or decline).
 * Only users in the invite's `pending` array can respond.
 */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;
  const postingId = params.pid;
  const inviteId = params.iid;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const body = await parseBody<{
    response: "accepted" | "declined";
  }>(req);

  if (!["accepted", "declined"].includes(body.response)) {
    throw new AppError(
      "VALIDATION",
      'response must be "accepted" or "declined"',
      400,
    );
  }

  // Fetch the invite
  const { data: invite, error: inviteError } = await supabase
    .from("space_invites")
    .select("*")
    .eq("id", inviteId)
    .eq("posting_id", postingId)
    .single();

  if (inviteError || !invite) {
    throw new AppError("NOT_FOUND", "Invite not found", 404);
  }

  // Verify the acting user is in the pending array
  const pending = (invite.pending ?? []) as string[];
  if (!pending.includes(user.id)) {
    throw new AppError(
      "FORBIDDEN",
      "You are not in the pending list for this invite",
      403,
    );
  }

  // Fetch the posting for sub_space_id
  const { data: posting, error: postingError } = await supabase
    .from("space_postings")
    .select("sub_space_id")
    .eq("id", postingId)
    .eq("space_id", spaceId)
    .single();

  if (postingError || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  const accepted = body.response === "accepted";
  const declined = (invite.declined ?? []) as string[];

  // Record the response
  await respond(supabase, inviteId, user.id, accepted, pending, declined);

  // If accepted and posting has a sub-space, add user to it
  if (accepted && posting.sub_space_id) {
    const { error: memberError } = await supabase.from("space_members").insert({
      space_id: posting.sub_space_id,
      user_id: user.id,
      role: "member",
    });

    if (memberError && memberError.code !== PG_UNIQUE_VIOLATION) {
      console.error("Failed to add user to sub-space:", memberError.message);
    }
  }

  // If declined and mode is sequential, advance to next person
  if (!accepted && invite.mode === "sequential") {
    const orderedList = (invite.ordered_list ?? []) as string[];
    const newIndex = (invite.current_index as number) + 1;

    if (newIndex < orderedList.length) {
      const nextUserId = orderedList[newIndex];
      const newPending = pending
        .filter((id) => id !== user.id)
        .concat(nextUserId);

      await advance(supabase, inviteId, newIndex, newPending);

      // Create invite activity card for the next person
      await supabase.from("activity_cards").insert({
        user_id: nextUserId,
        type: "invite",
        space_id: spaceId,
        posting_id: postingId,
        from_user_id: invite.created_by,
        data: { invite_id: inviteId },
        status: "pending",
      });
    }
  }

  // Create notification activity card for the invite creator
  await supabase.from("activity_cards").insert({
    user_id: invite.created_by,
    type: "invite",
    space_id: spaceId,
    posting_id: postingId,
    from_user_id: user.id,
    data: {
      invite_id: inviteId,
      action: body.response,
    },
    status: "pending",
  });

  return apiSuccess({ response: body.response });
});
