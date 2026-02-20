import {
  matchProfileToPostings,
  createMatchRecords,
  type MatchFilters,
} from "@/lib/matching/profile-to-posting";
import type { MatchResponse } from "@/lib/supabase/types";
import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess } from "@/lib/errors";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";
import { sendNotification } from "@/lib/notifications/create";

/**
 * GET /api/matches/for-me
 * Returns postings matching the authenticated user's profile
 */
export const GET = withAuth(async (req, { user, supabase }) => {
  // Parse optional filter params from query string
  const { searchParams } = new URL(req.url);
  const filters: MatchFilters = {};
  if (searchParams.get("category"))
    filters.category = searchParams.get("category")!;
  if (searchParams.get("context"))
    filters.context = searchParams.get("context")!;
  if (searchParams.get("location_mode"))
    filters.locationMode = searchParams.get("location_mode")!;
  if (searchParams.get("max_distance_km"))
    filters.maxDistanceKm = Number(searchParams.get("max_distance_km"));

  // Check if user has a profile first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("bio, headline, notification_preferences")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return apiSuccess({
      error: "Profile not found. Please complete your profile first.",
      matches: [],
    });
  }

  // Check if profile has enough data for matching
  const hasData = profile.bio || profile.headline;
  if (!hasData) {
    return apiSuccess({
      error:
        "Please add a bio, skills, or headline to your profile to find matches.",
      matches: [],
    });
  }

  // Find matching postings (with optional hard filters)
  const matches = await matchProfileToPostings(user.id, 10, filters);

  // Create match records in database if they don't exist
  if (matches.length > 0) {
    await createMatchRecords(user.id, matches);

    // Send match_found notification for top match if user has it enabled
    const userPrefs =
      profile.notification_preferences as NotificationPreferences | null;

    if (shouldNotify(userPrefs, "match_found", "in_app")) {
      const topMatch = matches[0];
      sendNotification(
        {
          userId: user.id,
          type: "match_found",
          title: "New Matches Found",
          body: `We found ${matches.length} posting${matches.length > 1 ? "s" : ""} matching your profile, including "${topMatch.posting.title}"`,
          relatedPostingId: topMatch.posting.id,
        },
        supabase,
      );
    }
  }

  // Transform to API response format
  const response: MatchResponse[] = matches.map((match) => ({
    id: match.matchId || "",
    posting: match.posting,
    score: match.score,
    explanation: null,
    score_breakdown: match.scoreBreakdown,
    status: "pending",
    created_at: match.posting.created_at,
  }));

  return apiSuccess({ matches: response });
});
