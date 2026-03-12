import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";

/**
 * PATCH /api/spaces/[id]/postings/[pid]/join/[rid]
 * Accept or reject a join request.
 * Only the posting creator or a space admin can act on requests.
 */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;
  const postingId = params.pid;
  const requestId = params.rid;

  const membership = await verifySpaceMembership(supabase, spaceId, user.id);

  // Fetch the posting to check ownership
  const { data: posting, error: postingError } = await supabase
    .from("space_postings")
    .select("created_by, sub_space_id")
    .eq("id", postingId)
    .eq("space_id", spaceId)
    .single();

  if (postingError || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  const isCreator = posting.created_by === user.id;
  const isAdmin = membership.role === "admin";

  if (!isCreator && !isAdmin) {
    throw new AppError(
      "FORBIDDEN",
      "Only the posting creator or a space admin can manage join requests",
      403,
    );
  }

  // Fetch the join request
  const { data: joinRequest, error: reqError } = await supabase
    .from("space_join_requests")
    .select("*")
    .eq("id", requestId)
    .eq("posting_id", postingId)
    .single();

  if (reqError || !joinRequest) {
    throw new AppError("NOT_FOUND", "Join request not found", 404);
  }

  if (joinRequest.status !== "pending" && joinRequest.status !== "waitlisted") {
    throw new AppError(
      "VALIDATION",
      `Cannot update a ${joinRequest.status} join request`,
      400,
    );
  }

  const body = await parseBody<{ status: "accepted" | "rejected" | "waitlisted" }>(
    req,
  );

  if (!["accepted", "rejected", "waitlisted"].includes(body.status)) {
    throw new AppError(
      "VALIDATION",
      'Status must be "accepted", "rejected", or "waitlisted"',
      400,
    );
  }

  const { data: updated, error: updateError } = await supabase
    .from("space_join_requests")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .select()
    .single();

  if (updateError) {
    throw new AppError(
      "INTERNAL",
      `Failed to update join request: ${updateError.message}`,
      500,
    );
  }

  // If accepted and posting has a sub-space, add user to the sub-space
  if (body.status === "accepted" && posting.sub_space_id) {
    const { error: memberError } = await supabase
      .from("space_members")
      .insert({
        space_id: posting.sub_space_id,
        user_id: joinRequest.user_id,
        role: "member",
      });

    if (memberError && memberError.code !== "23505") {
      // 23505 = already a member (idempotent)
      console.error("Failed to add user to sub-space:", memberError.message);
    }
  }

  // Create activity card for the requester
  await supabase.from("activity_cards").insert({
    user_id: joinRequest.user_id,
    type: "join_request",
    space_id: spaceId,
    posting_id: postingId,
    from_user_id: user.id,
    data: {
      join_request_id: requestId,
      action: body.status,
    },
    status: "pending",
  });

  return apiSuccess({ join_request: updated });
});
