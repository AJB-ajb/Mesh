"use client";

import { useState, useCallback } from "react";
import { useSWRConfig } from "swr";
import { cacheKeys } from "@/lib/swr/keys";
import { apiMutate } from "@/lib/swr/api-mutate";
import type { ProfileFormState } from "@/lib/types/profile";
import type { RecurringWindow } from "@/lib/types/availability";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useProfileSave(onSuccess: () => void) {
  const { mutate } = useSWRConfig();
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
        await apiMutate("/api/profiles", {
          method: "PATCH",
          body: { ...form, availabilityWindows },
          successToast: "profileSaved",
          errorFallback: "We couldn't save your profile. Please try again.",
        });

        setIsSaving(false);
        setSuccess(true);
        onSuccess();
        await mutate(cacheKeys.profile());
      } catch (err) {
        setIsSaving(false);
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't save your profile. Please try again.",
        );
      }
    },
    [mutate, onSuccess],
  );

  return { isSaving, error, setError, success, handleSubmit };
}
