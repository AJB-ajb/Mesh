/**
 * Profile-to-Project Matching
 * Finds projects that match a user's profile using pgvector cosine similarity
 */

import { createClient } from "@/lib/supabase/server";
import type { Project, ScoreBreakdown } from "@/lib/supabase/types";
import { generateProfileEmbedding } from "@/lib/ai/embeddings";

export interface ProfileToProjectMatch {
  project: Project;
  score: number; // 0-1 similarity score
  scoreBreakdown: ScoreBreakdown | null;
  matchId?: string; // If match record already exists
}

/**
 * Finds projects matching a user's profile
 * Uses the match_projects_to_user database function with pgvector similarity
 *
 * @param userId The user ID to find matches for
 * @param limit Maximum number of matches to return (default: 10)
 * @returns Array of matching projects with similarity scores
 */
export async function matchProfileToProjects(
  userId: string,
  limit: number = 10,
): Promise<ProfileToProjectMatch[]> {
  const supabase = await createClient();

  // First, get the user's profile and embedding
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("embedding, bio, skills, interests, headline")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `Profile not found for user ${userId}. Please complete your profile first.`,
    );
  }

  // If no embedding exists, try to generate one
  let embedding = profile.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    try {
      embedding = await generateProfileEmbedding(
        profile.bio,
        profile.skills,
        profile.interests,
        profile.headline,
      );

      // Save the generated embedding
      await supabase
        .from("profiles")
        .update({ embedding })
        .eq("user_id", userId);
    } catch (embeddingError) {
      // If embedding generation fails, return empty matches with a helpful message
      console.warn("Could not generate profile embedding:", embeddingError);
      throw new Error(
        "Could not generate profile embedding. Please ensure your profile has a bio, skills, or headline filled in.",
      );
    }
  }

  // Call the database function to find matching projects
  const { data, error } = await supabase.rpc("match_projects_to_user", {
    user_embedding: embedding,
    user_id_param: userId,
    match_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to match projects: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Check for existing match records
  const projectIds = data.map((row: { project_id: string }) => row.project_id);
  const { data: existingMatches } = await supabase
    .from("matches")
    .select("id, project_id, similarity_score, status, score_breakdown")
    .eq("user_id", userId)
    .in("project_id", projectIds);

  const matchMap = new Map(
    existingMatches?.map((m) => [m.project_id, m]) || [],
  );

  // Transform results into match objects and compute breakdowns
  const matches: ProfileToProjectMatch[] = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.map(async (row: any) => {
      const project: Project = {
        id: row.project_id,
        creator_id: row.creator_id,
        title: row.title,
        description: row.description,
        required_skills: row.required_skills || [],
        team_size: row.team_size,
        experience_level: row.experience_level,
        commitment_hours: row.commitment_hours,
        timeline: row.timeline,
        hard_filters: row.hard_filters || null,
        embedding: null, // Don't return embedding in response
        status: "open",
        is_test_data: row.is_test_data || false,
        created_at: row.created_at,
        updated_at: row.created_at,
        expires_at: row.expires_at,
      };

      const existingMatch = matchMap.get(row.project_id);

      // Compute score breakdown using database function
      let scoreBreakdown: ScoreBreakdown | null = null;
      if (existingMatch?.score_breakdown) {
        // Use existing breakdown if available
        scoreBreakdown = existingMatch.score_breakdown as ScoreBreakdown;
      } else {
        // Compute new breakdown
        const { data: breakdown, error: breakdownError } = await supabase.rpc(
          "compute_match_breakdown",
          {
            profile_user_id: userId,
            target_project_id: row.project_id,
          },
        );

        if (!breakdownError && breakdown) {
          scoreBreakdown = breakdown as ScoreBreakdown;
        }
      }

      return {
        project,
        score: row.similarity,
        scoreBreakdown,
        matchId: existingMatch?.id,
      };
    }),
  );

  return matches;
}

/**
 * Creates or updates match records in the database
 * Called after finding matches to persist them
 * Also updates existing matches that are missing score_breakdown
 */
export async function createMatchRecords(
  userId: string,
  matches: ProfileToProjectMatch[],
): Promise<void> {
  const supabase = await createClient();

  // Create new matches
  const matchInserts = matches
    .filter((m) => !m.matchId) // Only create new matches
    .map((m) => ({
      user_id: userId,
      project_id: m.project.id,
      similarity_score: m.score,
      score_breakdown: m.scoreBreakdown,
      status: "pending" as const,
    }));

  if (matchInserts.length > 0) {
    const { error } = await supabase.from("matches").upsert(matchInserts, {
      onConflict: "project_id,user_id",
      ignoreDuplicates: false,
    });

    if (error) {
      throw new Error(`Failed to create match records: ${error.message}`);
    }
  }

  // Update existing matches that are missing score_breakdown
  const updatesToMake = matches
    .filter((m) => m.matchId && m.scoreBreakdown) // Has matchId and computed breakdown
    .map((m) => ({
      id: m.matchId!,
      score_breakdown: m.scoreBreakdown,
    }));

  if (updatesToMake.length > 0) {
    // Update each match individually to set score_breakdown
    for (const update of updatesToMake) {
      const { error } = await supabase
        .from("matches")
        .update({ score_breakdown: update.score_breakdown })
        .eq("id", update.id)
        .is("score_breakdown", null); // Only update if currently null

      if (error) {
        console.warn(
          `Failed to update breakdown for match ${update.id}:`,
          error,
        );
        // Don't throw - this is not critical
      }
    }
  }
}
