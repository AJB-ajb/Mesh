import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { ScoreBreakdown, Profile } from "@/lib/supabase/types";
import type { SelectedPostingSkill } from "@/lib/types/skill";
import { deriveSkillNames } from "@/lib/skills/derive";
import { computeWeightedScore } from "@/lib/matching/scoring";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PostingDetail = {
  id: string;
  title: string;
  description: string;
  skills: string[];
  team_size_min: number;
  team_size_max: number;
  estimated_time: string;
  category: string;
  visibility: string;
  mode: string;
  status: string;
  created_at: string;
  expires_at: string;
  creator_id: string;
  location_mode: string | null;
  location_name: string | null;
  location_lat: number | null;
  location_lng: number | null;
  max_distance_km: number | null;
  tags?: string[];
  context_identifier?: string | null;
  auto_accept: boolean;
  availability_mode?: string | null;
  timezone?: string | null;
  source_text?: string | null;
  previous_source_text?: string | null;
  previous_posting_snapshot?: Record<string, unknown> | null;
  selectedPostingSkills?: SelectedPostingSkill[];
  profiles?: {
    full_name: string | null;
    headline: string | null;
    user_id: string;
  };
};

export type Application = {
  id: string;
  status: string;
  cover_message: string | null;
  created_at: string;
  applicant_id: string;
  profiles?: {
    full_name: string | null;
    headline: string | null;
    user_id: string;
  };
};

export type MatchedProfile = {
  profile_id: string;
  user_id: string;
  full_name: string | null;
  headline: string | null;
  overall_score: number;
  breakdown: ScoreBreakdown;
};

// PostingFormState is re-exported from the canonical location
import { type PostingFormState } from "@/lib/types/posting";
export type { PostingFormState };

export type PostingDetailData = {
  posting: PostingDetail | null;
  isOwner: boolean;
  currentUserId: string | null;
  currentUserProfile: Profile | null;
  matchBreakdown: ScoreBreakdown | null;
  applications: Application[];
  matchedProfiles: MatchedProfile[];
  myApplication: Application | null;
  hasApplied: boolean;
  waitlistPosition: number | null;
  acceptedCount: number | null;
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchPostingDetail(key: string): Promise<PostingDetailData> {
  const postingId = key.split("/")[1];
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const currentUserId = user?.id || null;

  // Fetch posting with creator profile and join table skills
  const { data: rawPosting, error: postingError } = await supabase
    .from("postings")
    .select(
      `
      *,
      profiles:creator_id (
        full_name,
        headline,
        user_id
      ),
      posting_skills(skill_id, level_min, skill_nodes(id, name, parent_id, depth))
    `,
    )
    .eq("id", postingId)
    .single();

  // Derive skills and selectedPostingSkills from join table
  let posting = rawPosting;
  if (rawPosting) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const psRows = (rawPosting.posting_skills as any[]) ?? [];
    const joinSkills = deriveSkillNames(psRows);

    // Build selectedPostingSkills for edit mode
    const selectedPostingSkills: SelectedPostingSkill[] = psRows
      .filter(
        (ps) =>
          ps.skill_nodes &&
          typeof ps.skill_nodes === "object" &&
          "id" in ps.skill_nodes,
      )
      .map((ps) => ({
        skillId: ps.skill_nodes.id as string,
        name: ps.skill_nodes.name as string,
        path: [],
        levelMin: ps.level_min as number | null,
      }));

    posting = {
      ...rawPosting,
      skills: joinSkills,
      selectedPostingSkills,
    };
  }

  if (postingError || !posting) {
    return {
      posting: null,
      isOwner: false,
      currentUserId,
      currentUserProfile: null,
      matchBreakdown: null,
      applications: [],
      matchedProfiles: [],
      myApplication: null,
      hasApplied: false,
      waitlistPosition: null,
      acceptedCount: null,
    };
  }

  const isOwner = currentUserId === posting.creator_id;

  let myApplication: Application | null = null;
  let hasApplied = false;
  let waitlistPosition: number | null = null;
  let currentUserProfile: Profile | null = null;
  let matchBreakdown: ScoreBreakdown | null = null;
  let applications: Application[] = [];
  let matchedProfiles: MatchedProfile[] = [];
  let acceptedCount: number | null = null;

  if (user && !isOwner) {
    // Non-owner: check application, fetch profile, compute match, count accepted
    const [applicationResult, profileResult, acceptedCountResult] =
      await Promise.all([
        supabase
          .from("applications")
          .select("*")
          .eq("posting_id", postingId)
          .eq("applicant_id", user.id)
          .maybeSingle(),
        supabase.from("profiles").select("*").eq("user_id", user.id).single(),
        supabase
          .from("applications")
          .select("*", { count: "exact" })
          .eq("posting_id", postingId)
          .eq("status", "accepted")
          .limit(0),
      ]);

    acceptedCount = acceptedCountResult.count ?? 0;

    if (applicationResult.data && !applicationResult.error) {
      const appData = applicationResult.data;
      myApplication = appData;
      hasApplied = true;

      // Compute waitlist position if waitlisted
      if (appData.status === "waitlisted") {
        const { count } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("posting_id", postingId)
          .eq("status", "waitlisted")
          .lt("created_at", appData.created_at);

        waitlistPosition = (count ?? 0) + 1; // 1-indexed
      }
    }

    if (profileResult.data) {
      currentUserProfile = profileResult.data;

      // Compute match breakdown
      try {
        const { data: breakdown, error: breakdownError } = await supabase.rpc(
          "compute_match_breakdown",
          {
            profile_user_id: user.id,
            target_posting_id: postingId,
          },
        );

        if (!breakdownError && breakdown) {
          matchBreakdown = breakdown as ScoreBreakdown;
        }
      } catch (err) {
        console.error("Failed to compute match breakdown:", err);
      }
    }
  }

  if (isOwner) {
    // Owner: fetch applications and matched profiles in parallel
    const [applicationsResult, allProfilesResult] = await Promise.all([
      supabase
        .from("applications")
        .select("*")
        .eq("posting_id", postingId)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select(
          "user_id, full_name, headline, location_preference, availability_slots, profile_skills(skill_nodes(name))",
        )
        .limit(50),
    ]);

    // Enrich applications with profiles
    if (applicationsResult.data && applicationsResult.data.length > 0) {
      const applicantIds = applicationsResult.data.map((a) => a.applicant_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select(
          "full_name, headline, user_id, profile_skills(skill_nodes(name))",
        )
        .in("user_id", applicantIds);

      applications = applicationsResult.data.map((app) => {
        const rawProfile = profilesData?.find(
          (p) => p.user_id === app.applicant_id,
        );
        if (!rawProfile) return { ...app, profiles: undefined };
        return {
          ...app,
          profiles: {
            ...rawProfile,
          },
        };
      });
    }

    // Compute matched profiles (parallelized)
    if (allProfilesResult.data) {
      const profiles = allProfilesResult.data.filter(
        (p) => p.user_id !== currentUserId,
      );

      const results = await Promise.all(
        profiles.map(async (profile) => {
          try {
            const { data: breakdown, error: breakdownError } =
              await supabase.rpc("compute_match_breakdown", {
                profile_user_id: profile.user_id,
                target_posting_id: postingId,
              });

            if (!breakdownError && breakdown) {
              const bd = breakdown as ScoreBreakdown;
              return {
                profile_id: profile.user_id,
                user_id: profile.user_id,
                full_name: profile.full_name,
                headline: profile.headline,
                overall_score: computeWeightedScore(bd),
                breakdown: bd,
              } satisfies MatchedProfile;
            }
          } catch {
            // Skip profiles that fail to compute
          }
          return null;
        }),
      );

      const scored = results.filter((r): r is MatchedProfile => r !== null);
      scored.sort((a, b) => b.overall_score - a.overall_score);
      matchedProfiles = scored.slice(0, 10);
    }
  }

  return {
    posting,
    isOwner,
    currentUserId,
    currentUserProfile,
    matchBreakdown,
    applications,
    matchedProfiles,
    myApplication,
    hasApplied,
    waitlistPosition,
    acceptedCount,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePostingDetail(postingId: string) {
  const { data, error, isLoading, mutate } = useSWR(
    postingId ? `posting-detail/${postingId}` : null,
    fetchPostingDetail,
  );

  return {
    posting: data?.posting ?? null,
    isOwner: data?.isOwner ?? false,
    currentUserId: data?.currentUserId ?? null,
    currentUserProfile: data?.currentUserProfile ?? null,
    matchBreakdown: data?.matchBreakdown ?? null,
    applications: data?.applications ?? [],
    matchedProfiles: data?.matchedProfiles ?? [],
    myApplication: data?.myApplication ?? null,
    hasApplied: data?.hasApplied ?? false,
    waitlistPosition: data?.waitlistPosition ?? null,
    acceptedCount: data?.acceptedCount ?? null,
    error,
    isLoading,
    mutate,
  };
}
