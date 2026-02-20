"use client";

import { useState, useCallback } from "react";
import type { KeyedMutator } from "swr";
import type { ProfileFormState } from "@/lib/types/profile";
import type { RecurringWindow } from "@/lib/types/availability";
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
    async (
      event: React.FormEvent<HTMLFormElement>,
      form: ProfileFormState,
      availabilityWindows?: RecurringWindow[],
    ) => {
      event.preventDefault();
      setError(null);
      setSuccess(false);
      setIsSaving(true);

      try {
        const res = await fetch("/api/profiles", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            availabilityWindows,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          setIsSaving(false);
          setError(
            data.error?.message ||
              "We couldn't save your profile. Please try again.",
          );
          return;
        }

        setIsSaving(false);
        setSuccess(true);
        onSuccess();
        await mutate();
      } catch {
        setIsSaving(false);
        setError("We couldn't save your profile. Please try again.");
      }
    },
    [mutate, onSuccess],
  );

  return { isSaving, error, setError, success, handleSubmit };
}
