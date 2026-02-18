import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { formatScore } from "@/lib/matching/scoring";
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
  skill_level_min: number | null;
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
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("postings")
    .select(
      `
      *,
      profiles:creator_id (
        full_name,
        user_id
      ),
      posting_skills(skill_nodes(name))
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

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const postings = (data || []).map((row) => {
    // Derive skills from join table, fall back to old column
    const joinSkills = deriveSkillNames(row.posting_skills);
    return {
      ...row,
      skills: joinSkills.length > 0 ? joinSkills : row.skills || [],
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
              const overallScore =
                breakdown.semantic * 0.3 +
                breakdown.availability * 0.3 +
                breakdown.skill_level * 0.2 +
                breakdown.location * 0.2;

              return {
                ...posting,
                compatibility_score: overallScore,
                score_breakdown: breakdown as ScoreBreakdown,
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

export function usePostings(tab: TabId, category?: string) {
  const key =
    category && category !== "all"
      ? `postings/${tab}/${category}`
      : `postings/${tab}`;

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
