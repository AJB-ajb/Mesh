"use client";

import type { ProfileFormState } from "@/lib/types/profile";
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
    setIsEditing: profileForm.setIsEditing,
    userEmail: data?.userEmail ?? null,
    connectedProviders: data?.connectedProviders ?? {
      github: false,
      google: false,
      linkedin: false,
    },
    isGithubProvider: data?.isGithubProvider ?? false,
    handleChange: profileForm.handleChange,
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) =>
      save.handleSubmit(e, profileForm.form),
    handleLinkProvider: providers.handleLinkProvider,
    sourceText: data?.sourceText ?? null,
    canUndo: data?.canUndo ?? false,
    isApplyingUpdate: aiUpdate.isApplyingUpdate,
    applyFreeFormUpdate: aiUpdate.applyFreeFormUpdate,
    undoLastUpdate: aiUpdate.undoLastUpdate,
    mutate,
  } satisfies Record<string, unknown> & { form: ProfileFormState };
}
