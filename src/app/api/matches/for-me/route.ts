import { NextResponse } from "next/server";
import { matchProfileToProjects, createMatchRecords } from "@/lib/matching/profile-to-project";
import type { MatchResponse } from "@/lib/supabase/types";
import { withAuth } from "@/lib/api/with-auth";

/**
 * GET /api/matches/for-me
 * Returns projects matching the authenticated user's profile
 */
export const GET = withAuth(async (_req, { user, supabase }) => {
  // Check if user has a profile first
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("bio, skills, headline")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      {
        error: "Profile not found. Please complete your profile first.",
        matches: [],
      },
      { status: 200 }
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
      { status: 200 }
    );
  }

  // Find matching projects
  const matches = await matchProfileToProjects(user.id, 10);

  // Create match records in database if they don't exist
  if (matches.length > 0) {
    await createMatchRecords(user.id, matches);
  }

  // Transform to API response format
  const response: MatchResponse[] = matches.map((match) => ({
    id: match.matchId || "",
    project: match.project,
    score: match.score,
    explanation: null,
    score_breakdown: match.scoreBreakdown,
    status: "pending",
    created_at: match.project.created_at,
  }));

  return NextResponse.json({ matches: response });
});
