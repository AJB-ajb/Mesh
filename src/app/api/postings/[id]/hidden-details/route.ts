import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * GET /api/postings/[id]/hidden-details
 * Returns hidden details text only if:
 * - Caller is the posting owner, OR
 * - Caller has an accepted application for this posting
 * Otherwise returns 403.
 */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const postingId = params.id;

  // Fetch posting with hidden_details
  const { data: posting, error: postingError } = await supabase
    .from("postings")
    .select("id, creator_id, hidden_details")
    .eq("id", postingId)
    .single();

  if (postingError || !posting) {
    return apiError("NOT_FOUND", "Posting not found", 404);
  }

  // Owner always sees hidden details
  if (posting.creator_id === user.id) {
    return apiSuccess({ hidden_details: posting.hidden_details });
  }

  // Check if user has an accepted application
  const { data: application } = await supabase
    .from("applications")
    .select("id, status")
    .eq("posting_id", postingId)
    .eq("applicant_id", user.id)
    .eq("status", "accepted")
    .maybeSingle();

  if (!application) {
    return apiError(
      "FORBIDDEN",
      "Hidden details are only available to accepted members",
      403,
    );
  }

  return apiSuccess({ hidden_details: posting.hidden_details });
});
