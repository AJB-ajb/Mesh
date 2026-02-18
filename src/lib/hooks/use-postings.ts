import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { computeWeightedScore, formatScore } from "@/lib/matching/scoring";
import type { ScoreBreakdown } from "@/lib/supabase/types";
import { deriveSkillNames } from "@/lib/skills/derive";

type Posting = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  team_size_min: number;
  team_size_max: number;
  category:
    | "study"
    | "hackathon"
    | "personal"
    | "professional"
    | "social"
    | null;
  tags: string[];
  mode: "open" | "friend_ask";
  location_preference: number | null;
  location_mode: string | null;
  location_name: string | null;
  estimated_time: string | null;
  context_identifier: string | null;
  natural_language_criteria: string | null;
  status: string;
  created_at: string;
  creator_id: string;
  profiles?: {
    full_name: string | null;
    user_id: string;
  };
};

type PostingWithScore = Posting & {
  compatibility_score?: number;
  score_breakdown?: ScoreBreakdown;
};

type TabId = "discover" | "my-postings";

/** Query-level filters applied at the database (more efficient than client-side). */
export interface QueryFilters {
  /** Skill node IDs to filter by (use /api/skills/descendants to resolve tree). */
  skillNodeIds?: string[];
  /** Location mode: "remote", "in_person", "either". */
  locationMode?: string;
  /** Context identifier (e.g. university, org). */
  contextIdentifier?: string;
}

type PostingsResult = {
  postings: PostingWithScore[];
  userId: string | null;
  isLoadingScores: boolean;
  interestedPostingIds: string[];
};

async function fetchPostings(key: string): Promise<PostingsResult> {
  const parts = key.split("/");
  const tab = parts[1] as TabId;
  const category = parts[2] || null;
  // Query-level filters are JSON-encoded in parts[3] if present
  const queryFilters: QueryFilters = parts[3] ? JSON.parse(parts[3]) : {};
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Use !inner join when filtering by skill IDs so only matching postings return
  const skillJoin =
    queryFilters.skillNodeIds && queryFilters.skillNodeIds.length > 0
      ? "posting_skills!inner(skill_id, skill_nodes(name))"
      : "posting_skills(skill_nodes(name))";

  let query = supabase
    .from("postings")
    .select(
      `
      *,
      profiles:creator_id (
        full_name,
        user_id
      ),
      ${skillJoin}
    `,
    )
    .order("created_at", { ascending: false });

  if (tab === "my-postings" && user) {
    query = query.eq("creator_id", user.id);
  } else {
    query = query
      .eq("status", "open")
      .gt("expires_at", new Date().toISOString());
    if (user) {
      query = query.neq("creator_id", user.id);
    }
  }

  // Category filter at query level
  if (category) {
    query = query.eq("category", category);
  }

  // Skill node IDs filter — posting must have at least one matching skill
  if (queryFilters.skillNodeIds && queryFilters.skillNodeIds.length > 0) {
    query = query.in("posting_skills.skill_id", queryFilters.skillNodeIds);
  }

  // Location mode filter at query level
  if (queryFilters.locationMode) {
    if (queryFilters.locationMode !== "either") {
      // Match exact or "either" (flexible)
      query = query.or(
        `location_mode.eq.${queryFilters.locationMode},location_mode.eq.either,location_mode.is.null`,
      );
    }
  }

  // Context identifier filter at query level
  if (queryFilters.contextIdentifier) {
    query = query.or(
      `context_identifier.eq.${queryFilters.contextIdentifier},context_identifier.is.null`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const postings = (data || []).map((row) => {
    // Derive skills from join table
    const joinSkills = deriveSkillNames(row.posting_skills);
    return {
      ...row,
      skills: joinSkills,
    };
  }) as PostingWithScore[];

  // Fetch user's existing application posting IDs (from applications table)
  let interestedPostingIds: string[] = [];
  if (user && tab === "discover") {
    const { data: applications } = await supabase
      .from("applications")
      .select("posting_id")
      .eq("applicant_id", user.id)
      .in("status", ["pending", "accepted", "waitlisted"]);

    interestedPostingIds = (applications || []).map((a) => a.posting_id);
  }

  // Compute compatibility scores for discover tab
  if (tab === "discover" && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profile) {
      const scored = await Promise.all(
        postings.map(async (posting) => {
          try {
            const { data: breakdown, error: rpcError } = await supabase.rpc(
              "compute_match_breakdown",
              {
                profile_user_id: user.id,
                target_posting_id: posting.id,
              },
            );

            if (!rpcError && breakdown) {
              const bd = breakdown as ScoreBreakdown;
              return {
                ...posting,
                compatibility_score: computeWeightedScore(bd),
                score_breakdown: bd,
              };
            }
          } catch (err) {
            console.error(
              `Failed to compute score for posting ${posting.id}:`,
              err,
            );
          }
          return posting;
        }),
      );
      return {
        postings: scored,
        userId: user?.id ?? null,
        isLoadingScores: false,
        interestedPostingIds,
      };
    }
  }

  return {
    postings,
    userId: user?.id ?? null,
    isLoadingScores: false,
    interestedPostingIds,
  };
}

export function usePostings(
  tab: TabId,
  category?: string,
  queryFilters?: QueryFilters,
) {
  const cat = category && category !== "all" ? category : "";
  // Serialize query filters to include in SWR key for proper caching
  const filterKey =
    queryFilters && Object.keys(queryFilters).length > 0
      ? JSON.stringify(queryFilters)
      : "";
  const key = `postings/${tab}${cat ? `/${cat}` : ""}${filterKey ? `/${filterKey}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR(key, fetchPostings, {
    keepPreviousData: true,
  });

  return {
    postings: data?.postings ?? [],
    userId: data?.userId ?? null,
    interestedPostingIds: data?.interestedPostingIds ?? [],
    error,
    isLoading,
    mutate,
  };
}

export { formatScore };
export type { Posting, PostingWithScore, TabId };
