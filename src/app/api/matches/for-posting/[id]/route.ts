import {
  matchPostingToProfiles,
  createMatchRecordsForPosting,
} from "@/lib/matching/posting-to-profile";
import type { MatchResponse } from "@/lib/supabase/types";
import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * GET /api/matches/for-posting/[id]
 * Returns profiles matching a specific posting (posting creator only)
 */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const postingId = params.id;

  // Verify user is the posting creator
  const { data: posting, error: postingError } = await supabase
    .from("postings")
    .select("creator_id")
    .eq("id", postingId)
    .single();

  if (postingError || !posting) {
    return apiError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id !== user.id) {
    return apiError("FORBIDDEN", "Only posting creators can view matches", 403);
  }

  // Find matching profiles
  const matches = await matchPostingToProfiles(postingId, 10);

  // Create match records in database if they don't exist
  await createMatchRecordsForPosting(postingId, matches);

  // Transform to API response format
  const response: MatchResponse[] = matches.map((match) => ({
    id: match.matchId || "",
    profile: match.profile,
    score: match.score,
    explanation: null,
    score_breakdown: match.scoreBreakdown,
    status: "pending",
    created_at: new Date().toISOString(),
  }));

  return apiSuccess({ matches: response });
});
