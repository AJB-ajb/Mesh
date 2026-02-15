/**
 * Profile-to-Posting Matching
 * Finds postings that match a user's profile using pgvector cosine similarity
 */

import { createClient } from "@/lib/supabase/server";
import type { Posting, ScoreBreakdown } from "@/lib/supabase/types";

export interface ProfileToPostingMatch {
  posting: Posting;
  score: number; // 0-1 similarity score
  scoreBreakdown: ScoreBreakdown | null;
  matchId?: string; // If match record already exists
}

/**
 * Finds postings matching a user's profile
 * Uses the match_postings_to_user database function with pgvector similarity
 *
 * @param userId The user ID to find matches for
 * @param limit Maximum number of matches to return (default: 10)
 * @returns Array of matching postings with similarity scores
 */
export async function matchProfileToPostings(
  userId: string,
  limit: number = 10,
): Promise<ProfileToPostingMatch[]> {
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

  // If no embedding exists, matching cannot proceed — embeddings are generated
  // asynchronously via the batch processor after profile save
  const embedding = profile.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error(
      "Your profile embedding is still being generated. Please try again in a moment.",
    );
  }

  // Call the database function to find matching postings
  const { data, error } = await supabase.rpc("match_postings_to_user", {
    user_embedding: embedding,
    user_id_param: userId,
    match_limit: limit,
  });

  if (error) {
    throw new Error(`Failed to match postings: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Check for existing match records
  const postingIds = data.map((row: { project_id: string }) => row.project_id);
  const { data: existingMatches } = await supabase
    .from("matches")
    .select("id, posting_id, similarity_score, status, score_breakdown")
    .eq("user_id", userId)
    .in("posting_id", postingIds);

  const matchMap = new Map(
    existingMatches?.map((m) => [m.posting_id, m]) || [],
  );

  // Transform results into match objects and compute breakdowns
  const matches: ProfileToPostingMatch[] = await Promise.all(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data.map(async (row: any) => {
      const posting: Posting = {
        id: row.project_id, // RPC still returns this column name
        creator_id: row.creator_id,
        title: row.title,
        description: row.description,
        skills: row.skills || [],
        team_size_min: row.team_size_min || 1,
        team_size_max: row.team_size_max || 1,
        category: row.category || null,
        context_identifier: row.context_identifier || null,
        tags: row.tags || [],
        mode: row.mode || "open",
        location_preference: row.location_preference ?? null,
        natural_language_criteria: row.natural_language_criteria || null,
        estimated_time: row.estimated_time || null,
        skill_level_min: row.skill_level_min ?? null,
        auto_accept: row.auto_accept ?? false,
        embedding: null,
        status: "open",
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
            target_posting_id: row.project_id,
          },
        );

        if (!breakdownError && breakdown) {
          scoreBreakdown = breakdown as ScoreBreakdown;
        }
      }

      return {
        posting: posting,
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
  matches: ProfileToPostingMatch[],
): Promise<void> {
  const supabase = await createClient();

  // Create new matches
  const matchInserts = matches
    .filter((m) => !m.matchId) // Only create new matches
    .map((m) => ({
      user_id: userId,
      posting_id: m.posting.id,
      similarity_score: m.score,
      score_breakdown: m.scoreBreakdown,
      status: "pending" as const,
    }));

  if (matchInserts.length > 0) {
    const { error } = await supabase.from("matches").upsert(matchInserts, {
      onConflict: "posting_id,user_id",
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
