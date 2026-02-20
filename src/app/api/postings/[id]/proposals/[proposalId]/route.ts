import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess, parseBody } from "@/lib/errors";

/** PATCH: Confirm or cancel a proposal (owner only) */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const postingId = params.id;
  const proposalId = params.proposalId;

  // Check if user is posting owner
  const { data: posting } = await supabase
    .from("postings")
    .select("creator_id")
    .eq("id", postingId)
    .single();

  if (!posting || posting.creator_id !== user.id) {
    return apiError(
      "FORBIDDEN",
      "Only the posting owner can update proposals",
      403,
    );
  }

  const { status } = await parseBody<{ status: string }>(req);

  if (!status || !["confirmed", "cancelled"].includes(status)) {
    return apiError(
      "VALIDATION",
      "status must be 'confirmed' or 'cancelled'",
      400,
    );
  }

  // Verify proposal belongs to this posting and is currently proposed
  const { data: existing } = await supabase
    .from("meeting_proposals")
    .select("status")
    .eq("id", proposalId)
    .eq("posting_id", postingId)
    .single();

  if (!existing) {
    return apiError("NOT_FOUND", "Proposal not found", 404);
  }

  if (existing.status !== "proposed") {
    return apiError(
      "VALIDATION",
      `Cannot change status from '${existing.status}' to '${status}'`,
      400,
    );
  }

  const { data: proposal, error } = await supabase
    .from("meeting_proposals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", proposalId)
    .select()
    .single();

  if (error) {
    return apiError("INTERNAL", error.message, 500);
  }

  return apiSuccess({ proposal });
});
