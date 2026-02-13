import { NextResponse } from "next/server";
import {
  matchProfileToPostings,
  createMatchRecords,
} from "@/lib/matching/profile-to-posting";
import type { MatchResponse } from "@/lib/supabase/types";
import { withAuth } from "@/lib/api/with-auth";
import {
  type NotificationPreferences,
  shouldNotify,
} from "@/lib/notifications/preferences";

/**
 * GET /api/matches/for-me
 * Returns postings matching the authenticated user's profile
 */
export const GET = withAuth(async (_req, { user, supabase }) => {
  // Check if user has a profile first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("bio, skills, headline, notification_preferences")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error: "Profile not found. Please complete your profile first.",
        matches: [],
      },
      { status: 200 },
    );
  }

  // Check if profile has enough data for matching
  const hasData =
    profile.bio ||
    (profile.skills && profile.skills.length > 0) ||
    profile.headline;
  if (!hasData) {
    return NextResponse.json(
      {
        error:
          "Please add a bio, skills, or headline to your profile to find matches.",
        matches: [],
      },
      { status: 200 },
    );
  }

  // Find matching postings
  const matches = await matchProfileToPostings(user.id, 10);

  // Create match records in database if they don't exist
  if (matches.length > 0) {
    await createMatchRecords(user.id, matches);

    // Send match_found notification for top match if user has it enabled
    const userPrefs =
      profile.notification_preferences as NotificationPreferences | null;

    if (shouldNotify(userPrefs, "match_found", "in_app")) {
      const topMatch = matches[0];
      await supabase.from("notifications").insert({
        user_id: user.id,
        type: "match_found",
        title: "New Matches Found",
        body: `We found ${matches.length} posting${matches.length > 1 ? "s" : ""} matching your profile, including "${topMatch.posting.title}"`,
        related_posting_id: topMatch.posting.id,
      });
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

  return NextResponse.json({ matches: response });
});
