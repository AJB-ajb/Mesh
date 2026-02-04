import { NextResponse } from "next/server";
import {
  matchProjectToProfiles,
  createMatchRecordsForProject,
} from "@/lib/matching/project-to-profile";
import type { MatchResponse } from "@/lib/supabase/types";
import { getTestDataValue } from "@/lib/environment";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

/**
 * GET /api/matches/for-project/[id]
 * Returns profiles matching a specific project (project owner only)
 */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const projectId = params.id;

  // Verify user is the project creator
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("creator_id")
    .eq("id", projectId)
    .eq("is_test_data", getTestDataValue())
    .single();

  if (projectError || !project) {
    return apiError("NOT_FOUND", "Project not found", 404);
  }

  if (project.creator_id !== user.id) {
    return apiError("FORBIDDEN", "Only project creators can view matches", 403);
  }

  // Find matching profiles
  const matches = await matchProjectToProfiles(projectId, 10);

  // Create match records in database if they don't exist
  await createMatchRecordsForProject(projectId, matches);

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

  return NextResponse.json({ matches: response });
});
