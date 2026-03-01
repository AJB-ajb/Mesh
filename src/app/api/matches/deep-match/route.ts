import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess, parseBody } from "@/lib/errors";
import {
  deepMatchCandidate,
  isDeepMatchAvailable,
} from "@/lib/matching/deep-match";
import type { DeepMatchResult } from "@/lib/matching/deep-match";

/**
 * POST /api/matches/deep-match
 * On-demand deep matching for specific match IDs
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  if (!isDeepMatchAvailable()) {
    return apiError("INTERNAL", "Deep matching is not configured", 503);
  }

  const { matchIds } = await parseBody<{ matchIds: string[] }>(req);

  if (!matchIds || !Array.isArray(matchIds) || matchIds.length === 0) {
    return apiError("VALIDATION", "matchIds array is required", 400);
  }

  if (matchIds.length > 10) {
    return apiError("VALIDATION", "Maximum 10 matches per request", 400);
  }

  // Fetch matches with posting and profile data
  const { data: matches, error } = await supabase
    .from("matches")
    .select("id, posting_id, user_id, similarity_score, score_breakdown")
    .in("id", matchIds)
    .or(`user_id.eq.${user.id}`);

  if (error) {
    return apiError(
      "INTERNAL",
      `Failed to fetch matches: ${error.message}`,
      500,
    );
  }

  if (!matches || matches.length === 0) {
    return apiError("NOT_FOUND", "No matches found", 404);
  }

  // Fetch posting and profile source texts
  const postingIds = [...new Set(matches.map((m) => m.posting_id))];
  const userIds = [...new Set(matches.map((m) => m.user_id))];

  const { data: postings } = await supabase
    .from("postings")
    .select("id, title, source_text, description")
    .in("id", postingIds);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, source_text, bio, headline")
    .in("user_id", userIds);

  const postingMap = new Map(postings?.map((p) => [p.id, p]) ?? []);
  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

  const results: Array<{ matchId: string; result: DeepMatchResult }> = [];

  for (const match of matches) {
    const posting = postingMap.get(match.posting_id);
    const profile = profileMap.get(match.user_id);

    if (!posting || !profile) continue;

    const postingText = posting.source_text || posting.description || "";
    const profileText =
      profile.source_text || profile.bio || profile.headline || "";

    if (!postingText || !profileText) continue;

    const breakdown = match.score_breakdown as {
      semantic?: number;
      availability?: number;
      skill_level?: number;
    } | null;

    try {
      const result = await deepMatchCandidate({
        postingTitle: posting.title,
        postingText,
        profileText,
        fastFilterScore: match.similarity_score,
        sharedSkills: [],
        availabilityOverlap: breakdown?.availability ?? null,
        distanceKm: null,
        semanticScore: breakdown?.semantic ?? null,
      });

      // Store result in database
      await supabase
        .from("matches")
        .update({
          deep_match_score: result.score,
          deep_match_explanation: result.explanation,
          deep_match_concerns: result.concerns,
          deep_match_role: result.matchedRole,
          deep_matched_at: new Date().toISOString(),
        })
        .eq("id", match.id);

      results.push({ matchId: match.id, result });
    } catch (err) {
      console.error(`Deep match failed for match ${match.id}:`, err);
    }
  }

  return apiSuccess({ results });
});
