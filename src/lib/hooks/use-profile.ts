"use client";

import { useState, useCallback } from "react";
import type { ProfileFormState } from "@/lib/types/profile";
import type { RecurringWindow } from "@/lib/types/availability";
import { gridToWindows } from "@/lib/availability/quick-mode";
import { useProfileData } from "./use-profile-data";
import { useProfileForm } from "./use-profile-form";
import { useProfileSave } from "./use-profile-save";
import { useProfileAiUpdate } from "./use-profile-ai-update";
import { useProfileProviders } from "./use-profile-providers";

// ---------------------------------------------------------------------------
// Facade — composes sub-hooks to preserve the original public API.
// ---------------------------------------------------------------------------

export function useProfile() {
  const { data, error: fetchError, isLoading, mutate } = useProfileData();
  const profileForm = useProfileForm(data);
  const save = useProfileSave(mutate, () => {
    profileForm.setIsEditing(false);
  });
  const aiUpdate = useProfileAiUpdate(
    profileForm.form,
    data?.sourceText ?? null,
    mutate,
  );
  const providers = useProfileProviders();

  // Availability windows state — initialised from fetched data,
  // managed locally during edit, synced on save.
  const [localWindows, setLocalWindows] = useState<RecurringWindow[] | null>(
    null,
  );

  // When editing, use local draft; otherwise use fetched data
  const availabilityWindows: RecurringWindow[] = profileForm.isEditing
    ? (localWindows ??
      data?.recurringWindows ??
      gridToWindows(profileForm.form.availabilitySlots))
    : (data?.recurringWindows ??
      gridToWindows(profileForm.form.availabilitySlots));

  const handleAvailabilityWindowsChange = useCallback(
    (windows: RecurringWindow[]) => {
      setLocalWindows(windows);
    },
    [],
  );

  // Override setIsEditing to also init/clear local windows
  const originalSetIsEditing = profileForm.setIsEditing;
  const setIsEditing = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      originalSetIsEditing(value);
      const next =
        typeof value === "function" ? value(profileForm.isEditing) : value;
      if (next) {
        // Entering edit mode — snapshot windows
        setLocalWindows(
          data?.recurringWindows ??
            gridToWindows(profileForm.form.availabilitySlots),
        );
      } else {
        // Leaving edit mode — discard draft
        setLocalWindows(null);
      }
    },
    [
      originalSetIsEditing,
      profileForm.isEditing,
      data?.recurringWindows,
      profileForm.form.availabilitySlots,
    ],
  );

  // Merge errors from sub-hooks
  const error =
    save.error ??
    aiUpdate.error ??
    providers.error ??
    (fetchError ? "Failed to load profile." : null);

  return {
    form: profileForm.form,
    setForm: profileForm.setForm,
    isLoading,
    isSaving: save.isSaving,
    error,
    setError: save.setError,
    success: save.success || aiUpdate.success,
    isEditing: profileForm.isEditing,
    setIsEditing,
    userEmail: data?.userEmail ?? null,
    connectedProviders: data?.connectedProviders ?? {
      github: false,
      google: false,
      linkedin: false,
    },
    isGithubProvider: data?.isGithubProvider ?? false,
    handleChange: profileForm.handleChange,
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) =>
      save.handleSubmit(e, profileForm.form, availabilityWindows),
    handleLinkProvider: providers.handleLinkProvider,
    sourceText: data?.sourceText ?? null,
    canUndo: data?.canUndo ?? false,
    isApplyingUpdate: aiUpdate.isApplyingUpdate,
    applyFreeFormUpdate: aiUpdate.applyFreeFormUpdate,
    undoLastUpdate: aiUpdate.undoLastUpdate,
    availabilityWindows,
    onAvailabilityWindowsChange: handleAvailabilityWindowsChange,
    mutate,
  } satisfies Record<string, unknown> & { form: ProfileFormState };
}
