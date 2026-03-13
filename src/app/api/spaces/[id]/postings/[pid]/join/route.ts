import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import type { Json } from "@/lib/supabase/types";

/**
 * POST /api/spaces/[id]/postings/[pid]/join
 * Submit a join request for a posting.
 * If the posting has auto_accept, the request is immediately accepted.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;
  const postingId = params.pid;

  // Verify the user is a member of the parent space
  await verifySpaceMembership(supabase, spaceId, user.id);

  // Fetch the posting
  const { data: posting, error: postingError } = await supabase
    .from("space_postings")
    .select("*")
    .eq("id", postingId)
    .eq("space_id", spaceId)
    .single();

  if (postingError || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.status !== "open" && posting.status !== "active") {
    throw new AppError(
      "VALIDATION",
      "This posting is no longer accepting join requests",
      400,
    );
  }

  if (posting.created_by === user.id) {
    throw new AppError(
      "VALIDATION",
      "You cannot join your own posting",
      400,
    );
  }

  // Check for existing join request
  const { data: existing } = await supabase
    .from("space_join_requests")
    .select("id, status")
    .eq("posting_id", postingId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "pending" || existing.status === "accepted") {
      throw new AppError(
        "CONFLICT",
        `You already have a ${existing.status} join request for this posting`,
        409,
      );
    }
    // Allow re-requesting after rejection/withdrawal
  }

  const body = await parseBody<{ responses?: Json }>(req);

  const initialStatus = posting.auto_accept ? "accepted" : "pending";

  const { data: joinRequest, error: insertError } = await supabase
    .from("space_join_requests")
    .insert({
      posting_id: postingId,
      user_id: user.id,
      status: initialStatus,
      responses: body.responses ?? null,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      throw new AppError(
        "CONFLICT",
        "You already have a join request for this posting",
        409,
      );
    }
    throw new AppError(
      "INTERNAL",
      `Failed to submit join request: ${insertError.message}`,
      500,
    );
  }

  // If auto-accepted and posting has a sub-space, add user to the sub-space
  if (initialStatus === "accepted" && posting.sub_space_id) {
    await supabase.from("space_members").insert({
      space_id: posting.sub_space_id,
      user_id: user.id,
      role: "member",
    });
  }

  // Create an activity card for the posting creator
  if (initialStatus === "pending") {
    await supabase.from("activity_cards").insert({
      user_id: posting.created_by,
      type: "join_request",
      space_id: spaceId,
      posting_id: postingId,
      from_user_id: user.id,
      data: { join_request_id: joinRequest.id },
      status: "pending",
    });
  }

  return apiSuccess({ join_request: joinRequest }, 201);
});
