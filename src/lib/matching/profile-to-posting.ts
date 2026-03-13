/**
 * Profile-to-Posting Matching
 * Finds postings that match a user's profile using pgvector cosine similarity
 */

import { createClient } from "@/lib/supabase/server";
import type { Posting, ScoreBreakdown } from "@/lib/supabase/types";
import { MATCH_SCORE_THRESHOLD } from "@/lib/matching/scoring";
import { MATCHING, DEEP_MATCH } from "@/lib/constants";
import {
  deepMatchCandidates,
  isDeepMatchAvailable,
  blendScores,
  type DeepMatchResult,
} from "@/lib/matching/deep-match";

export interface MatchFilters {
  category?: string;
  context?: string;
  parentPostingId?: string;
  locationMode?: string;
  maxDistanceKm?: number;
}

export interface ProfileToPostingMatch {
  posting: Posting;
  score: number; // 0-1 similarity score
  scoreBreakdown: ScoreBreakdown | null;
  matchId?: string; // If match record already exists
  deepMatchResult?: DeepMatchResult;
}

/**
 * Finds postings matching a user's profile
 * Uses the match_postings_to_user database function with pgvector similarity
 *
 * @param userId The user ID to find matches for
 * @param limit Maximum number of matches to return (default: 10)
 * @param filters Optional hard filters for category, context, location
 * @returns Array of matching postings with similarity scores
 */
export async function matchProfileToPostings(
  userId: string,
  limit: number = MATCHING.DEFAULT_RESULT_LIMIT,
  filters?: MatchFilters,
  deepMatch: boolean = false,
  spaceId?: string,
): Promise<ProfileToPostingMatch[]> {
  const supabase = await createClient();

  // Fetch user's profile with location data for hard filters
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "embedding, bio, interests, headline, location_lat, location_lng, location_mode",
    )
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
    console.warn(
      `[matching] Profile embedding not ready for user ${userId}, returning empty matches`,
    );
    return [];
  }

  // Build RPC params for the v2 space_postings-based matching
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpcParams: Record<string, any> = {
    target_user_id: userId,
    match_count: limit,
  };

  if (spaceId) rpcParams.scope_space_id = spaceId;

  const { data, error } = await supabase.rpc(
    "match_postings_to_user_v2",
    rpcParams,
  );

  if (error) {
    throw new Error(`Failed to match postings: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Check for existing activity_cards (type: 'match') for these postings
  const postingIds = data.map((row: { posting_id: string }) => row.posting_id);
  const { data: existingCards } = await supabase
    .from("activity_cards")
    .select("id, posting_id, score, status, data")
    .eq("user_id", userId)
    .eq("type", "match")
    .in("posting_id", postingIds);

  const cardMap = new Map(
    existingCards?.map((c) => [c.posting_id, c]) || [],
  );

  // Transform results into match objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches: ProfileToPostingMatch[] = data.map((row: any) => {
    const posting: Posting = {
      id: row.posting_id,
      creator_id: row.posting_created_by,
      title: "",
      description: row.posting_text || "",
      team_size_min: 1,
      team_size_max: 1,
      category: row.posting_category || null,
      context_identifier: null,
      parent_posting_id: null,
      tags: row.posting_tags || [],
      visibility: "public",
      mode: "open",
      location_preference: null,
      natural_language_criteria: null,
      estimated_time: null,
      auto_accept: false,
      availability_mode: "flexible",
      timezone: null,
      embedding: null,
      status: "open",
      created_at: "",
      updated_at: "",
      expires_at: null,
      identified_roles: null,
      in_discover: true,
      link_token: null,
    };

    const existingCard = cardMap.get(row.posting_id);
    const scoreBreakdown: ScoreBreakdown | null =
      (existingCard?.data as { score_breakdown?: ScoreBreakdown })
        ?.score_breakdown ?? null;

    return {
      posting,
      score: row.score,
      scoreBreakdown,
      matchId: existingCard?.id,
    };
  });

  // Deep match: run LLM evaluation on top N candidates if requested
  if (deepMatch && isDeepMatchAvailable()) {
    const topN = matches.slice(0, DEEP_MATCH.DEFAULT_TOP_N);

    // Fetch source texts for space_postings and profile
    const deepPostingIds = topN.map((m) => m.posting.id);
    const { data: postingSources } = await supabase
      .from("space_postings")
      .select("id, text")
      .in("id", deepPostingIds);
    const { data: profileSource } = await supabase
      .from("profiles")
      .select("source_text, bio, headline")
      .eq("user_id", userId)
      .single();

    const postingSourceMap = new Map(
      postingSources?.map((p) => [p.id, p]) ?? [],
    );
    const profileText =
      profileSource?.source_text ||
      profileSource?.bio ||
      profileSource?.headline ||
      "";

    if (profileText) {
      const candidates = topN
        .map((m) => {
          const ps = postingSourceMap.get(m.posting.id);
          const postingText =
            ps?.text || m.posting.description || "";
          return {
            postingTitle: m.posting.title || m.posting.category || "Space Posting",
            postingText,
            profileText,
            fastFilterScore: m.score,
            sharedSkills: [] as string[],
            availabilityOverlap: m.scoreBreakdown?.availability ?? null,
            distanceKm: null as number | null,
            semanticScore: m.scoreBreakdown?.semantic ?? null,
          };
        })
        .filter((c) => c.postingText);

      if (candidates.length > 0) {
        const deepResults = await deepMatchCandidates(
          // Use the first posting title as a placeholder — each candidate
          // has its own posting context in the prompt
          candidates[0].postingTitle,
          candidates[0].postingText,
          candidates,
        );

        // Attach deep match results and blend scores
        let resultIdx = 0;
        topN.forEach((m) => {
          if (resultIdx < deepResults.length) {
            const ps = postingSourceMap.get(m.posting.id);
            const postingText =
              ps?.text || m.posting.description || "";
            if (postingText) {
              m.deepMatchResult = deepResults[resultIdx];
              m.score = blendScores(m.score, deepResults[resultIdx].score);
              resultIdx++;
            }
          }
        });

        // Re-sort by blended score
        matches.sort((a, b) => b.score - a.score);
      }
    }
  }

  return matches;
}

/**
 * Creates or updates match records as activity_cards (type: 'match')
 * Called after finding matches to persist them
 * Also updates existing cards that are missing score data
 */
export async function createMatchRecords(
  userId: string,
  matches: ProfileToPostingMatch[],
): Promise<void> {
  const supabase = await createClient();

  // Create new activity_cards for matches (exclude near-zero scores)
  const cardInserts = matches
    .filter((m) => !m.matchId && m.score > MATCH_SCORE_THRESHOLD)
    .map((m) => ({
      user_id: userId,
      type: "match" as const,
      title: m.posting.title || m.posting.category || "Match",
      subtitle: m.posting.description?.slice(0, 100) || null,
      posting_id: m.posting.id,
      from_user_id: m.posting.creator_id,
      score: m.score,
      data: {
        score_breakdown: m.scoreBreakdown,
        deep_match: m.deepMatchResult ?? null,
      },
      status: "pending" as const,
    }));

  if (cardInserts.length > 0) {
    const { error } = await supabase.from("activity_cards").insert(cardInserts);

    if (error) {
      throw new Error(`Failed to create match activity cards: ${error.message}`);
    }
  }

  // Update existing cards that have new score data
  const updatesToMake = matches
    .filter((m) => m.matchId && m.scoreBreakdown)
    .map((m) => ({
      id: m.matchId!,
      data: {
        score_breakdown: m.scoreBreakdown,
        deep_match: m.deepMatchResult ?? null,
      },
    }));

  if (updatesToMake.length > 0) {
    for (const update of updatesToMake) {
      const { error } = await supabase
        .from("activity_cards")
        .update({ data: update.data })
        .eq("id", update.id);

      if (error) {
        console.warn(
          `Failed to update data for activity card ${update.id}:`,
          error,
        );
      }
    }
  }
}
