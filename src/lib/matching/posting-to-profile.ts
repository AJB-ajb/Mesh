/**
 * Posting-to-Profile Matching
 * Finds profiles that match a posting using pgvector cosine similarity
 */

import { createClient } from "@/lib/supabase/server";
import type { Profile, ScoreBreakdown } from "@/lib/supabase/types";
import { MATCHING, DEEP_MATCH } from "@/lib/constants";
import { MATCH_SCORE_THRESHOLD } from "@/lib/matching/scoring";
import {
  isDeepMatchAvailable,
  applyDeepMatchResults,
  type DeepMatchResult,
} from "@/lib/matching/deep-match";

export interface PostingToProfileMatch {
  profile: Profile;
  score: number; // 0-1 similarity score
  scoreBreakdown: ScoreBreakdown | null;
  matchId?: string; // If match record already exists
  deepMatchResult?: DeepMatchResult;
}

/**
 * Finds profiles matching a posting
 * Uses the match_users_to_posting database function with pgvector similarity
 *
 * @param postingId The posting ID to find matches for
 * @param limit Maximum number of matches to return (default: 10)
 * @returns Array of matching profiles with similarity scores
 */
export async function matchPostingToProfiles(
  postingId: string,
  limit: number = MATCHING.DEFAULT_RESULT_LIMIT,
  deepMatch: boolean = false,
): Promise<PostingToProfileMatch[]> {
  const supabase = await createClient();

  // First, get the space_posting and its embedding
  const { data: posting, error: postingError } = await supabase
    .from("space_postings")
    .select("embedding, created_by, text, category, space_id")
    .eq("id", postingId)
    .single();

  if (postingError || !posting) {
    throw new Error(`Space posting not found: ${postingId}`);
  }

  // If no embedding exists, matching cannot proceed — embeddings are generated
  // asynchronously via the batch processor after posting save
  const embedding = posting.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    console.warn(
      `[matching] Space posting embedding not ready for ${postingId}, returning empty matches`,
    );
    return [];
  }

  // Use v2 RPC which handles embedding lookup internally
  const rpcParams = {
    target_posting_id: postingId,
    match_count: limit,
  };

  const { data, error } = await supabase.rpc(
    "match_users_to_posting_v2",
    rpcParams,
  );

  if (error) {
    throw new Error(`Failed to match profiles: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // v2 RPC returns only user_id and score — fetch profile data separately
  const userIds = data.map((row: { user_id: string }) => row.user_id);

  const { data: profileRows } = await supabase
    .from("profiles")
    .select(
      "user_id, full_name, headline, bio, location_lat, location_lng, location_preference, location_mode, availability_slots",
    )
    .in("user_id", userIds);

  const profileMap = new Map(profileRows?.map((p) => [p.user_id, p]) || []);

  // Check for existing activity_cards (type: 'match') for this posting
  const { data: existingCards } = await supabase
    .from("activity_cards")
    .select("id, user_id, score, data")
    .eq("type", "match")
    .eq("posting_id", postingId)
    .in("user_id", userIds);

  const cardMap = new Map(existingCards?.map((c) => [c.user_id, c]) || []);

  // Transform results into match objects
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const matches: PostingToProfileMatch[] = (data as any[]).map((row: any) => {
    const pr = profileMap.get(row.user_id);
    const profile: Profile = {
      user_id: row.user_id,
      full_name: pr?.full_name ?? null,
      headline: pr?.headline ?? null,
      bio: pr?.bio ?? null,
      location: null,
      location_lat: pr?.location_lat ?? null,
      location_lng: pr?.location_lng ?? null,
      interests: null,
      languages: null,
      portfolio_url: null,
      github_url: null,
      location_preference: pr?.location_preference ?? null,
      location_mode: pr?.location_mode ?? null,
      availability_slots: pr?.availability_slots || null,
      source_text: null,
      previous_source_text: null,
      previous_profile_snapshot: null,
      embedding: null,
      timezone: null,
      notification_preferences: null,
      tier: "free",
      created_at: "",
      updated_at: "",
    };

    const existingCard = cardMap.get(row.user_id);
    const scoreBreakdown: ScoreBreakdown | null =
      (existingCard?.data as { score_breakdown?: ScoreBreakdown })
        ?.score_breakdown ?? null;

    return {
      profile,
      score: row.score,
      scoreBreakdown,
      matchId: existingCard?.id,
    };
  });

  // Deep match: run LLM evaluation on top N candidates if requested
  if (deepMatch && isDeepMatchAvailable()) {
    const topN = matches.slice(0, DEEP_MATCH.DEFAULT_TOP_N);

    // Fetch posting text from space_postings
    const postingTitle = posting.category || "Space Posting";
    let postingText = posting.text || "";

    // Fetch parent space state_text for additional context
    const { data: parentSpace } = await supabase
      .from("spaces")
      .select("state_text")
      .eq("id", posting.space_id)
      .single();

    const parentStateText = parentSpace?.state_text || "";

    // Prepend parent space context when available
    if (parentStateText) {
      postingText = `[Space context: ${parentStateText}]\n\n${postingText}`;
    }

    if (postingText) {
      // Fetch profile source texts
      const deepUserIds = topN.map((m) => m.profile.user_id);
      const { data: profileSources } = await supabase
        .from("profiles")
        .select("user_id, source_text, bio, headline")
        .in("user_id", deepUserIds);

      const profileSourceMap = new Map(
        profileSources?.map((p) => [p.user_id, p]) ?? [],
      );

      await applyDeepMatchResults({
        topN,
        allMatches: matches,
        postingTitle,
        postingText,
        buildCandidate: (entry) => {
          const ps = profileSourceMap.get(entry.profile.user_id);
          const profileText = ps?.source_text || ps?.bio || ps?.headline || "";
          if (!profileText) return null;
          return {
            profileText,
            parentStateText,
            fastFilterScore: entry.score,
            sharedSkills: [],
            availabilityOverlap: entry.scoreBreakdown?.availability ?? null,
            distanceKm: null,
            semanticScore: entry.scoreBreakdown?.semantic ?? null,
          };
        },
      });
    }
  }

  return matches;
}

/**
 * Creates or updates match records as activity_cards (type: 'match')
 * Called after finding matches to persist them
 */
export async function createMatchRecordsForPosting(
  postingId: string,
  matches: PostingToProfileMatch[],
): Promise<void> {
  const supabase = await createClient();

  const cardInserts = matches
    .filter((m) => !m.matchId && m.score > MATCH_SCORE_THRESHOLD)
    .map((m) => ({
      user_id: m.profile.user_id,
      type: "match" as const,
      title: "You matched with a posting",
      posting_id: postingId,
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
      throw new Error(
        `Failed to create match activity cards: ${error.message}`,
      );
    }
  }

  // Update existing cards with new score data
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
