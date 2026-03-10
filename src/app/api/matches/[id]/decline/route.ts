import type { MatchResponse } from "@/lib/supabase/types";
import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError } from "@/lib/errors";

/**
 * PATCH /api/matches/[id]/decline
 * Posting owner declines an applicant
 * Changes status from 'applied' to 'declined'
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
    throw new AppError("NOT_FOUND", "Match not found", 404);
  }

  const posting = match.posting as Record<string, unknown> | null;

  if (!posting || posting.creator_id !== user.id) {
    throw new AppError(
      "FORBIDDEN",
      "Only posting creators can decline applicants",
      403,
    );
  }

  if (match.status !== "applied") {
    throw new AppError(
      "VALIDATION",
      `Match is not in 'applied' status (current: ${match.status})`,
      400,
    );
  }

  const { data: updatedMatch, error: updateError } = await supabase
    .from("matches")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select(`*, posting:postings!project_id(*), profile:profiles(*)`)
    .single();

  if (updateError || !updatedMatch) {
    throw new AppError("INTERNAL", "Failed to update match", 500);
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
    deep_match_score: updatedMatch.deep_match_score ?? null,
    deep_match_explanation: updatedMatch.deep_match_explanation ?? null,
    deep_match_concerns: updatedMatch.deep_match_concerns ?? null,
    deep_match_role: updatedMatch.deep_match_role ?? null,
  };

  return apiSuccess({ match: response });
});
