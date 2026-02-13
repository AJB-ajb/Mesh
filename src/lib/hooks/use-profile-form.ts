"use client";

import {
  useState,
  useCallback,
  type Dispatch,
  type SetStateAction,
} from "react";
import { type ProfileFormState, defaultFormState } from "@/lib/types/profile";
import type { ProfileFetchResult } from "./use-profile-data";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages profile form state.
 *
 * Eliminates the dual-state pattern: when the user is NOT editing, the form
 * reads directly from SWR data (single source of truth). When editing, a
 * local draft is maintained and discarded on cancel or flushed on save.
 */
export function useProfileForm(profileData: ProfileFetchResult | undefined) {
  const [localDraft, setLocalDraft] = useState<ProfileFormState | null>(null);
  const [rawIsEditing, setRawIsEditing] = useState(false);

  // When NOT editing → profileData.form is truth
  // When editing → localDraft is truth
  const form = rawIsEditing
    ? (localDraft ?? defaultFormState)
    : (profileData?.form ?? defaultFormState);

  // Wrap setIsEditing to snapshot form data when entering edit mode.
  // This preserves backwards compatibility — callers using setIsEditing(true)
  // will also initialise the local draft.
  const setIsEditing = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      setRawIsEditing((prev) => {
        const next = typeof value === "function" ? value(prev) : value;
        if (next && !prev) {
          // Entering edit mode → snapshot SWR form into draft
          setLocalDraft(profileData?.form ?? defaultFormState);
        } else if (!next && prev) {
          // Leaving edit mode → discard draft
          setLocalDraft(null);
        }
        return next;
      });
    },
    [profileData?.form],
  );

  const startEditing = useCallback(() => {
    setIsEditing(true);
  }, [setIsEditing]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, [setIsEditing]);

  const handleChange = useCallback(
    (field: keyof ProfileFormState, value: string) => {
      if (rawIsEditing) {
        setLocalDraft((prev) => (prev ? { ...prev, [field]: value } : null));
      }
    },
    [rawIsEditing],
  );

  // Expose setForm with the same signature expected by use-github-sync and
  // use-location (Dispatch<SetStateAction<ProfileFormState>>).
  const setForm: Dispatch<SetStateAction<ProfileFormState>> = useCallback(
    (updater) => {
      setLocalDraft((prev) => {
        const current = prev ?? defaultFormState;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [],
  );

  return {
    form,
    setForm,
    isEditing: rawIsEditing,
    setIsEditing,
    startEditing,
    cancelEditing,
    handleChange,
  };
}
