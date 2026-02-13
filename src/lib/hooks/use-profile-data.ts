"use client";

import useSWR from "swr";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  type ProfileFormState,
  type SkillLevel,
  type AvailabilitySlots,
  type LocationMode,
  defaultFormState,
} from "@/lib/types/profile";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProfileFetchResult = {
  form: ProfileFormState;
  userEmail: string | null;
  connectedProviders: {
    github: boolean;
    google: boolean;
    linkedin: boolean;
  };
  isGithubProvider: boolean;
  sourceText: string | null;
  canUndo: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseSkillLevels(raw: unknown): SkillLevel[] {
  if (raw == null) return [];
  // DB stores as { "domain": level } object or as SkillLevel[]
  if (Array.isArray(raw)) {
    return raw.filter(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "name" in item &&
        "level" in item,
    ) as SkillLevel[];
  }
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, number>).map(
      ([name, level]) => ({ name, level: Number(level) || 0 }),
    );
  }
  return [];
}

function parseLocationMode(raw: unknown): LocationMode {
  if (raw === "remote" || raw === "in_person" || raw === "either") return raw;
  return "either";
}

function parseAvailabilitySlots(raw: unknown): AvailabilitySlots {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as AvailabilitySlots;
  }
  return {};
}

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchProfile(): Promise<ProfileFetchResult> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const identities = user.identities || [];
  const connectedProviders = {
    github: identities.some(
      (id: { provider: string }) => id.provider === "github",
    ),
    google: identities.some(
      (id: { provider: string }) => id.provider === "google",
    ),
    linkedin: identities.some(
      (id: { provider: string }) => id.provider === "linkedin_oidc",
    ),
  };

  const appProvider = user.app_metadata?.provider;
  const appProviders = user.app_metadata?.providers || [];
  const hasGithubIdentity = identities.some(
    (identity: { provider: string }) => identity.provider === "github",
  );
  const isGithubProvider =
    appProvider === "github" ||
    appProviders.includes("github") ||
    hasGithubIdentity;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  let form = defaultFormState;
  let sourceText: string | null = null;
  let canUndo = false;

  if (data) {
    sourceText = data.source_text ?? null;
    canUndo = !!data.previous_source_text;
    form = {
      fullName: data.full_name ?? "",
      headline: data.headline ?? "",
      bio: data.bio ?? "",
      location: data.location ?? "",
      locationLat: data.location_lat?.toString() ?? "",
      locationLng: data.location_lng?.toString() ?? "",
      skills: Array.isArray(data.skills) ? data.skills.join(", ") : "",
      interests: Array.isArray(data.interests) ? data.interests.join(", ") : "",
      languages: Array.isArray(data.languages) ? data.languages.join(", ") : "",
      portfolioUrl: data.portfolio_url ?? "",
      githubUrl: data.github_url ?? "",
      skillLevels: parseSkillLevels(data.skill_levels),
      locationMode: parseLocationMode(data.location_mode),
      availabilitySlots: parseAvailabilitySlots(data.availability_slots),
    };
  }

  return {
    form,
    userEmail: user.email ?? null,
    connectedProviders,
    isGithubProvider,
    sourceText,
    canUndo,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfileData() {
  const router = useRouter();

  return useSWR("profile", fetchProfile, {
    onError: () => {
      router.replace("/login");
    },
  });
}
