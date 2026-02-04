import { NextResponse } from "next/server";
import type { MatchResponse } from "@/lib/supabase/types";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

/**
 * PATCH /api/matches/[id]/decline
 * Project owner declines an applicant
 * Changes status from 'applied' to 'declined'
 */
export const PATCH = withAuth(async (_req, { user, supabase, params }) => {
  const matchId = params.id;

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select(`*, project:projects(*)`)
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    return apiError("NOT_FOUND", "Match not found", 404);
  }

  const project = match.project as Record<string, unknown>;

  if (project?.creator_id !== user.id) {
    return apiError("FORBIDDEN", "Only project creators can decline applicants", 403);
  }

  if (match.status !== "applied") {
    return apiError("VALIDATION", `Match is not in 'applied' status (current: ${match.status})`, 400);
  }

  const { data: updatedMatch, error: updateError } = await supabase
    .from("matches")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", matchId)
    .select(`*, project:projects(*), profile:profiles(*)`)
    .single();

  if (updateError || !updatedMatch) {
    return apiError("INTERNAL", "Failed to update match", 500);
  }

  const response: MatchResponse = {
    id: updatedMatch.id,
    project: updatedMatch.project as MatchResponse["project"],
    profile: updatedMatch.profile as MatchResponse["profile"],
    score: updatedMatch.similarity_score,
    explanation: updatedMatch.explanation,
    score_breakdown: updatedMatch.score_breakdown,
    status: updatedMatch.status,
    created_at: updatedMatch.created_at,
  };

  return NextResponse.json({ match: response });
});
