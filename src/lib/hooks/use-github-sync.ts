"use client";

import { useState, useCallback } from "react";
import type { GitHubSyncStatus, ProfileFormState } from "@/lib/types/profile";
import { parseList } from "@/lib/types/profile";

export function useGithubSync(
  setForm: React.Dispatch<React.SetStateAction<ProfileFormState>>,
  setIsEditing: (editing: boolean) => void
) {
  const [githubSync, setGithubSync] = useState<GitHubSyncStatus | null>(null);
  const [isGithubSyncing, setIsGithubSyncing] = useState(false);
  const [githubSyncError, setGithubSyncError] = useState<string | null>(null);

  const fetchGithubSyncStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/github/sync");
      if (response.ok) {
        const data = await response.json();
        setGithubSync(data);
      }
    } catch (err) {
      console.error("Failed to fetch GitHub sync status:", err);
    }
  }, []);

  const handleGithubSync = useCallback(async () => {
    setIsGithubSyncing(true);
    setGithubSyncError(null);

    try {
      const response = await fetch("/api/github/sync", {
        method: "POST",
      });

      if (!response.ok) {
        let errorMessage = "Failed to sync GitHub profile";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        setGithubSyncError(errorMessage);
        return;
      }

      await fetchGithubSyncStatus();
      window.location.reload();
    } catch (err) {
      console.error("GitHub sync error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to sync GitHub profile. Please try again.";
      setGithubSyncError(errorMessage);
    } finally {
      setIsGithubSyncing(false);
    }
  }, [fetchGithubSyncStatus]);

  const applySuggestion = useCallback(
    (field: "skills" | "interests" | "bio", values: string | string[]) => {
      if (field === "bio" && typeof values === "string") {
        setForm((prev) => ({ ...prev, bio: values }));
      } else if (Array.isArray(values)) {
        setForm((prev) => {
          const currentValues = parseList(prev[field]);
          const newValues = [...new Set([...currentValues, ...values])];
          return { ...prev, [field]: newValues.join(", ") };
        });
      }
      setIsEditing(true);
    },
    [setForm, setIsEditing]
  );

  return {
    githubSync,
    isGithubSyncing,
    githubSyncError,
    fetchGithubSyncStatus,
    handleGithubSync,
    applySuggestion,
  };
}
