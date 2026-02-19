"use client";

import type { KeyedMutator } from "swr";
import {
  type ProfileFormState,
  type ExtractedProfileV2,
  parseList,
} from "@/lib/types/profile";
import type { ProfileFetchResult } from "./use-profile-data";
import { useAiUpdate, type AiUpdateConfig } from "./use-ai-update";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function buildProfileConfig(): AiUpdateConfig<
  ProfileFormState,
  ExtractedProfileV2
> {
  return {
    table: "profiles",
    rowColumn: "user_id",
    snapshotColumn: "previous_profile_snapshot",
    useUpsert: true,
    upsertConflict: "user_id",

    buildSnapshot: (form) => ({
      full_name: form.fullName,
      headline: form.headline,
      bio: form.bio,
      location: form.location,
      interests: parseList(form.interests),
      languages: parseList(form.languages),
      portfolio_url: form.portfolioUrl,
      github_url: form.githubUrl,
      location_mode: form.locationMode,
      availability_slots: form.availabilitySlots,
    }),

    buildExtractedFields: (extracted) => ({
      ...(extracted.full_name != null && { full_name: extracted.full_name }),
      ...(extracted.headline != null && { headline: extracted.headline }),
      ...(extracted.bio != null && { bio: extracted.bio }),
      ...(extracted.location != null && { location: extracted.location }),
      ...(extracted.interests != null && { interests: extracted.interests }),
      ...(extracted.languages != null && { languages: extracted.languages }),
      ...(extracted.portfolio_url != null && {
        portfolio_url: extracted.portfolio_url,
      }),
      ...(extracted.github_url != null && {
        github_url: extracted.github_url,
      }),
      ...(extracted.location_mode != null && {
        location_mode: extracted.location_mode,
      }),
      ...(extracted.availability_slots != null && {
        availability_slots: extracted.availability_slots,
      }),
    }),

    buildRestoredFields: (snapshot) => ({
      ...(snapshot.full_name != null && { full_name: snapshot.full_name }),
      ...(snapshot.headline != null && { headline: snapshot.headline }),
      ...(snapshot.bio != null && { bio: snapshot.bio }),
      ...(snapshot.location != null && { location: snapshot.location }),
      ...(snapshot.interests != null && { interests: snapshot.interests }),
      ...(snapshot.languages != null && { languages: snapshot.languages }),
      ...(snapshot.portfolio_url != null && {
        portfolio_url: snapshot.portfolio_url,
      }),
      ...(snapshot.github_url != null && {
        github_url: snapshot.github_url,
      }),
      ...(snapshot.location_mode != null && {
        location_mode: snapshot.location_mode,
      }),
      ...(snapshot.availability_slots != null && {
        availability_slots: snapshot.availability_slots,
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfileAiUpdate(
  currentForm: ProfileFormState,
  sourceText: string | null,
  mutate: KeyedMutator<ProfileFetchResult>,
) {
  const config = buildProfileConfig();
  return useAiUpdate<ProfileFormState, ExtractedProfileV2>(
    currentForm,
    sourceText,
    mutate as KeyedMutator<unknown>,
    config,
  );
}
