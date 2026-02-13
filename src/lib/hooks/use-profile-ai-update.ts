"use client";

import { useState, useCallback } from "react";
import type { KeyedMutator } from "swr";
import { createClient } from "@/lib/supabase/client";
import {
  type ProfileFormState,
  type ExtractedProfileV2,
  parseList,
} from "@/lib/types/profile";
import { triggerEmbeddingGeneration } from "@/lib/api/trigger-embedding";
import type { ProfileFetchResult } from "./use-profile-data";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfileAiUpdate(
  currentForm: ProfileFormState,
  sourceText: string | null,
  mutate: KeyedMutator<ProfileFetchResult>,
) {
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const applyFreeFormUpdate = useCallback(
    async (updatedText: string, extractedProfile: ExtractedProfileV2) => {
      setError(null);
      setIsApplyingUpdate(true);

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setIsApplyingUpdate(false);
        setError("Please sign in again.");
        return;
      }

      // Build snapshot of current profile fields for undo
      const currentSnapshot: Record<string, unknown> = {
        full_name: currentForm.fullName,
        headline: currentForm.headline,
        bio: currentForm.bio,
        location: currentForm.location,
        skills: parseList(currentForm.skills),
        interests: parseList(currentForm.interests),
        languages: parseList(currentForm.languages),
        portfolio_url: currentForm.portfolioUrl,
        github_url: currentForm.githubUrl,
        skill_levels: currentForm.skillLevels,
        location_mode: currentForm.locationMode,
        availability_slots: currentForm.availabilitySlots,
      };

      // Save updated profile + undo data to DB
      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          source_text: updatedText,
          previous_source_text: sourceText ?? null,
          previous_profile_snapshot: currentSnapshot,
          // Apply extracted fields
          ...(extractedProfile.full_name != null && {
            full_name: extractedProfile.full_name,
          }),
          ...(extractedProfile.headline != null && {
            headline: extractedProfile.headline,
          }),
          ...(extractedProfile.bio != null && { bio: extractedProfile.bio }),
          ...(extractedProfile.location != null && {
            location: extractedProfile.location,
          }),
          ...(extractedProfile.skills != null && {
            skills: extractedProfile.skills,
          }),
          ...(extractedProfile.interests != null && {
            interests: extractedProfile.interests,
          }),
          ...(extractedProfile.languages != null && {
            languages: extractedProfile.languages,
          }),
          ...(extractedProfile.portfolio_url != null && {
            portfolio_url: extractedProfile.portfolio_url,
          }),
          ...(extractedProfile.github_url != null && {
            github_url: extractedProfile.github_url,
          }),
          ...(extractedProfile.skill_levels != null && {
            skill_levels: extractedProfile.skill_levels,
          }),
          ...(extractedProfile.location_mode != null && {
            location_mode: extractedProfile.location_mode,
          }),
          ...(extractedProfile.availability_slots != null && {
            availability_slots: extractedProfile.availability_slots,
          }),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      setIsApplyingUpdate(false);

      if (upsertError) {
        setError("Failed to save update. Please try again.");
        return;
      }

      triggerEmbeddingGeneration();

      setSuccess(true);
      await mutate();
    },
    [currentForm, sourceText, mutate],
  );

  const undoLastUpdate = useCallback(async () => {
    setError(null);
    setIsApplyingUpdate(true);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsApplyingUpdate(false);
      setError("Please sign in again.");
      return;
    }

    // Fetch the previous snapshot from DB
    const { data: profileData } = await supabase
      .from("profiles")
      .select("previous_source_text, previous_profile_snapshot")
      .eq("user_id", user.id)
      .single();

    if (!profileData?.previous_source_text) {
      setIsApplyingUpdate(false);
      setError("Nothing to undo.");
      return;
    }

    const snapshot = (profileData.previous_profile_snapshot ?? {}) as Record<
      string,
      unknown
    >;

    // Restore previous state
    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        source_text: profileData.previous_source_text,
        previous_source_text: null,
        previous_profile_snapshot: null,
        ...(snapshot.full_name != null && { full_name: snapshot.full_name }),
        ...(snapshot.headline != null && { headline: snapshot.headline }),
        ...(snapshot.bio != null && { bio: snapshot.bio }),
        ...(snapshot.location != null && { location: snapshot.location }),
        ...(snapshot.skills != null && { skills: snapshot.skills }),
        ...(snapshot.interests != null && { interests: snapshot.interests }),
        ...(snapshot.languages != null && { languages: snapshot.languages }),
        ...(snapshot.portfolio_url != null && {
          portfolio_url: snapshot.portfolio_url,
        }),
        ...(snapshot.github_url != null && {
          github_url: snapshot.github_url,
        }),
        ...(snapshot.skill_levels != null && {
          skill_levels: snapshot.skill_levels,
        }),
        ...(snapshot.location_mode != null && {
          location_mode: snapshot.location_mode,
        }),
        ...(snapshot.availability_slots != null && {
          availability_slots: snapshot.availability_slots,
        }),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    setIsApplyingUpdate(false);

    if (upsertError) {
      setError("Failed to undo. Please try again.");
      return;
    }

    setSuccess(true);
    await mutate();
  }, [mutate]);

  return {
    isApplyingUpdate,
    error,
    success,
    applyFreeFormUpdate,
    undoLastUpdate,
  };
}
