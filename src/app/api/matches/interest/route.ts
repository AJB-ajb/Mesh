import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * POST /api/matches/interest
 * Express interest in an open-mode posting.
 * Creates a match record with status: 'interested'.
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await req.json();
  const { posting_id } = body;

  if (!posting_id || typeof posting_id !== "string") {
    return apiError("VALIDATION", "posting_id is required", 400);
  }

  // Fetch the posting
  const { data: posting, error: postingError } = await supabase
    .from("postings")
    .select("id, creator_id, mode, visibility, status")
    .eq("id", posting_id)
    .single();

  if (postingError || !posting) {
    return apiError("NOT_FOUND", "Posting not found", 404);
  }

  // Must be a public posting (not private/invite-only)
  const postingVisibility =
    posting.visibility ??
    (posting.mode === "friend_ask" ? "private" : "public");
  if (postingVisibility === "private") {
    return apiError(
      "VALIDATION",
      "Can only express interest in public postings",
      400,
    );
  }

  // Cannot express interest in own posting
  if (posting.creator_id === user.id) {
    return apiError(
      "VALIDATION",
      "Cannot express interest in your own posting",
      400,
    );
  }

  // Check posting is still open
  if (posting.status !== "open") {
    return apiError("VALIDATION", "This posting is no longer open", 400);
  }

  // Check for existing match (any status) to prevent duplicates
  const { data: existing } = await supabase
    .from("matches")
    .select("id, status")
    .eq("posting_id", posting_id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return apiError(
      "CONFLICT",
      "You have already expressed interest or have an existing match for this posting",
      409,
    );
  }

  // Create match record with 'interested' status
  const { data: match, error: insertError } = await supabase
    .from("matches")
    .insert({
      posting_id,
      user_id: user.id,
      similarity_score: 0,
      status: "interested",
    })
    .select()
    .single();

  if (insertError) {
    return apiError("INTERNAL", "Failed to create interest record", 500);
  }

  return apiSuccess({ match }, 201);
});
