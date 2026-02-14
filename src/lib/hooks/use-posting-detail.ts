import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { ScoreBreakdown, Profile } from "@/lib/supabase/types";

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
  skill_level_min?: number | null;
  profiles?: {
    full_name: string | null;
    headline: string | null;
    skills: string[] | null;
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
    skills: string[] | null;
    user_id: string;
  };
};

export type MatchedProfile = {
  profile_id: string;
  user_id: string;
  full_name: string | null;
  headline: string | null;
  skills: string[] | null;
  overall_score: number;
  breakdown: ScoreBreakdown;
};

// PostingFormState is re-exported from the canonical location
import { type PostingFormState } from "@/lib/types/posting";
export type { PostingFormState };

type PostingDetailData = {
  posting: PostingDetail | null;
  isOwner: boolean;
  currentUserId: string | null;
  currentUserProfile: Profile | null;
  matchBreakdown: ScoreBreakdown | null;
  applications: Application[];
  matchedProfiles: MatchedProfile[];
  myApplication: Application | null;
  hasApplied: boolean;
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

  // Fetch posting with creator profile
  const { data: posting, error: postingError } = await supabase
    .from("postings")
    .select(
      `
      *,
      profiles:creator_id (
        full_name,
        headline,
        skills,
        user_id
      )
    `,
    )
    .eq("id", postingId)
    .single();

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
    };
  }

  const isOwner = currentUserId === posting.creator_id;

  let myApplication: Application | null = null;
  let hasApplied = false;
  let currentUserProfile: Profile | null = null;
  let matchBreakdown: ScoreBreakdown | null = null;
  let applications: Application[] = [];
  let matchedProfiles: MatchedProfile[] = [];

  if (user && !isOwner) {
    // Non-owner: check application, fetch profile, compute match
    const [applicationResult, profileResult] = await Promise.all([
      supabase
        .from("applications")
        .select("*")
        .eq("posting_id", postingId)
        .eq("applicant_id", user.id)
        .maybeSingle(),
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    ]);

    if (applicationResult.data && !applicationResult.error) {
      myApplication = applicationResult.data;
      hasApplied = true;
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
          "user_id, full_name, headline, skills, skill_levels, location_preference, availability_slots",
        ),
    ]);

    // Enrich applications with profiles
    if (applicationsResult.data && applicationsResult.data.length > 0) {
      const applicantIds = applicationsResult.data.map((a) => a.applicant_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("full_name, headline, skills, user_id")
        .in("user_id", applicantIds);

      applications = applicationsResult.data.map((app) => ({
        ...app,
        profiles: profilesData?.find((p) => p.user_id === app.applicant_id),
      }));
    }

    // Compute matched profiles
    if (allProfilesResult.data) {
      const scored: MatchedProfile[] = [];

      for (const profile of allProfilesResult.data) {
        if (profile.user_id === currentUserId) continue;

        try {
          const { data: breakdown, error: breakdownError } = await supabase.rpc(
            "compute_match_breakdown",
            {
              profile_user_id: profile.user_id,
              target_posting_id: postingId,
            },
          );

          if (!breakdownError && breakdown) {
            const overallScore =
              breakdown.semantic * 0.3 +
              breakdown.availability * 0.3 +
              breakdown.skill_level * 0.2 +
              breakdown.location * 0.2;

            scored.push({
              profile_id: profile.user_id,
              user_id: profile.user_id,
              full_name: profile.full_name,
              headline: profile.headline,
              skills: profile.skills,
              overall_score: overallScore,
              breakdown: breakdown as ScoreBreakdown,
            });
          }
        } catch (err) {
          console.error(
            `Failed to compute match for profile ${profile.user_id}:`,
            err,
          );
        }
      }

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
    error,
    isLoading,
    mutate,
  };
}
