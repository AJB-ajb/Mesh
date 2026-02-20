import type { MatchResponse } from "@/lib/supabase/types";
import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * GET /api/matches/[id]
 * Returns full match details including profile and project information
 */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const matchId = params.id;

  // Fetch match with joined profile and project data
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(
      `
      *,
      project:projects(*),
      profile:profiles(*)
    `,
    )
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return apiError("NOT_FOUND", "Match not found", 404);
  }

  // Verify user has access to this match
  const project = match.project as Record<string, unknown>;
  const profile = match.profile as Record<string, unknown>;

  if (match.user_id !== user.id && project?.creator_id !== user.id) {
    return apiError("FORBIDDEN", "Access denied", 403);
  }

  const response: MatchResponse = {
    id: match.id,
    posting: project as unknown as MatchResponse["posting"],
    profile: profile as unknown as MatchResponse["profile"],
    score: match.similarity_score,
    explanation: match.explanation,
    score_breakdown: match.score_breakdown,
    status: match.status,
    created_at: match.created_at,
  };

  return apiSuccess({ match: response });
});
