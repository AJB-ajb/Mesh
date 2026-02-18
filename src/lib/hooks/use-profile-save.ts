"use client";

import { useState, useCallback } from "react";
import type { KeyedMutator } from "swr";
import { createClient } from "@/lib/supabase/client";
import { type ProfileFormState, parseList } from "@/lib/types/profile";
import { triggerEmbeddingGeneration } from "@/lib/api/trigger-embedding";
import type { ProfileFetchResult } from "./use-profile-data";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfileSave(
  mutate: KeyedMutator<ProfileFetchResult>,
  onSuccess: () => void,
) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>, form: ProfileFormState) => {
      event.preventDefault();
      setError(null);
      setSuccess(false);
      setIsSaving(true);

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setIsSaving(false);
        setError("Please sign in again to save your profile.");
        return;
      }

      const locationLat = Number(form.locationLat);
      const locationLng = Number(form.locationLng);

      // Derive backward-compat fields from selectedSkills
      const skillLevelsObj: Record<string, number> = {};
      for (const sl of form.skillLevels) {
        if (sl.name.trim()) {
          skillLevelsObj[sl.name.trim()] = sl.level;
        }
      }
      // Also add selectedSkills to the skill_levels object for backward compat
      for (const ss of form.selectedSkills) {
        skillLevelsObj[ss.name] = ss.level;
      }

      // Merge selectedSkills names into the free-form skills array
      const selectedSkillNames = form.selectedSkills.map((s) => s.name);
      const freeFormSkills = parseList(form.skills);
      const allSkillNames = [
        ...new Set([...selectedSkillNames, ...freeFormSkills]),
      ];

      const { error: upsertError } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          full_name: form.fullName.trim(),
          headline: form.headline.trim(),
          bio: form.bio.trim(),
          location: form.location.trim(),
          location_lat: Number.isFinite(locationLat) ? locationLat : null,
          location_lng: Number.isFinite(locationLng) ? locationLng : null,
          skills: allSkillNames,
          interests: parseList(form.interests),
          languages: parseList(form.languages),
          portfolio_url: form.portfolioUrl.trim(),
          github_url: form.githubUrl.trim(),
          skill_levels: skillLevelsObj,
          location_mode: form.locationMode,
          availability_slots: form.availabilitySlots,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (upsertError) {
        setIsSaving(false);
        setError("We couldn't save your profile. Please try again.");
        return;
      }

      // Sync profile_skills join table
      if (form.selectedSkills.length > 0) {
        // Delete existing rows and re-insert
        await supabase
          .from("profile_skills")
          .delete()
          .eq("profile_id", user.id);

        const profileSkillRows = form.selectedSkills.map((s) => ({
          profile_id: user.id,
          skill_id: s.skillId,
          level: s.level,
        }));
        await supabase.from("profile_skills").insert(profileSkillRows);
      } else {
        // Clear all profile skills if none selected
        await supabase
          .from("profile_skills")
          .delete()
          .eq("profile_id", user.id);
      }

      setIsSaving(false);

      triggerEmbeddingGeneration();

      setSuccess(true);
      onSuccess();
      await mutate();
    },
    [mutate, onSuccess],
  );

  return { isSaving, error, setError, success, handleSubmit };
}
