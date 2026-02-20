import type { MatchResponse } from "@/lib/supabase/types";
import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * PATCH /api/matches/[id]/accept
 * Posting owner accepts an applicant.
 * Changes match status from 'applied' to 'accepted'.
 * If accepted count reaches team_size_max, auto-fills the posting.
 */
export const PATCH = withAuth(async (_req, { user, supabase, params }) => {
  const matchId = params.id;

  // NOTE: matches.project_id references the postings table (renamed from projects).
  // Use the FK column name `project_id` for the join.
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(`*, posting:postings!project_id(*)`)
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return apiError("NOT_FOUND", "Match not found", 404);
  }

  const posting = match.posting as Record<string, unknown>;

  if (posting?.creator_id !== user.id) {
    return apiError(
      "FORBIDDEN",
      "Only posting creators can accept applicants",
      403,
    );
  }

  if (match.status !== "applied") {
    return apiError(
      "VALIDATION",
      `Match is not in 'applied' status (current: ${match.status})`,
      400,
    );
  }

  const { data: updatedMatch, error: updateError } = await supabase
    .from("matches")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select(`*, posting:postings!project_id(*), profile:profiles(*)`)
    .single();

  if (updateError || !updatedMatch) {
    return apiError("INTERNAL", "Failed to update match", 500);
  }

  // --- Auto-fill: if accepted count reaches capacity, mark posting as filled ---
  const postingId = match.project_id as string;
  const teamSizeMax = (posting.team_size_max as number) || 1;

  const { count: acceptedCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("project_id", postingId)
    .eq("status", "accepted");

  if (acceptedCount !== null && acceptedCount >= teamSizeMax) {
    await supabase
      .from("postings")
      .update({ status: "filled", updated_at: new Date().toISOString() })
      .eq("id", postingId);
  }

  const response: MatchResponse = {
    id: updatedMatch.id,
    posting: updatedMatch.posting as MatchResponse["posting"],
    profile: updatedMatch.profile as MatchResponse["profile"],
    score: updatedMatch.similarity_score,
    explanation: updatedMatch.explanation,
    score_breakdown: updatedMatch.score_breakdown,
    status: updatedMatch.status,
    created_at: updatedMatch.created_at,
  };

  return apiSuccess({ match: response });
});
