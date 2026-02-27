"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { KeyedMutator } from "swr";

import { createClient } from "@/lib/supabase/client";
import type {
  PostingDetail,
  PostingFormState,
  PostingDetailData,
} from "@/lib/hooks/use-posting-detail";
import { usePostingAiUpdate } from "@/lib/hooks/use-posting-ai-update";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import type { RecurringWindow } from "@/lib/types/availability";

/**
 * Map a PostingDetail to an editable PostingFormState.
 */
function postingToForm(
  posting: PostingDetail,
  windows: RecurringWindow[],
): PostingFormState {
  return {
    title: posting.title,
    description: posting.description,
    skills: posting.skills?.join(", ") || "",
    estimatedTime: posting.estimated_time || "",
    teamSizeMin: posting.team_size_min?.toString() || "1",
    teamSizeMax: posting.team_size_max?.toString() || "5",
    lookingFor: posting.team_size_max?.toString() || "3",
    category: posting.category || "personal",
    visibility:
      posting.visibility ??
      (posting.mode === "friend_ask" ? "private" : "public"),
    mode: posting.mode || "open",
    status: posting.status || "open",
    expiresAt: posting.expires_at ? posting.expires_at.slice(0, 10) : "",
    locationMode: posting.location_mode || "either",
    locationName: posting.location_name || "",
    locationLat: posting.location_lat?.toString() || "",
    locationLng: posting.location_lng?.toString() || "",
    maxDistanceKm: posting.max_distance_km?.toString() || "",
    tags: posting.tags?.join(", ") || "",
    contextIdentifier: posting.context_identifier || "",
    skillLevelMin: "",
    autoAccept: posting.auto_accept ? "true" : "false",
    availabilityMode:
      (posting.availability_mode as PostingFormState["availabilityMode"]) ||
      "flexible",
    timezone: posting.timezone || "",
    availabilityWindows: windows,
    specificWindows: [],
    selectedSkills: posting.selectedPostingSkills ?? [],
    hiddenDetails: posting.hidden_details ?? "",
  };
}

export function usePostingActions(
  postingId: string,
  posting: PostingDetail | null,
  mutate: KeyedMutator<PostingDetailData>,
) {
  const router = useRouter();

  const [isDeleting, setIsDeleting] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isReposting, setIsReposting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<PostingFormState>({
    title: "",
    description: "",
    skills: "",
    estimatedTime: "",
    teamSizeMin: "1",
    teamSizeMax: "5",
    lookingFor: "3",
    category: "personal",
    visibility: "public",
    mode: "open",
    status: "open",
    expiresAt: "",
    locationMode: "either",
    locationName: "",
    locationLat: "",
    locationLng: "",
    maxDistanceKm: "",
    tags: "",
    contextIdentifier: "",
    skillLevelMin: "",
    autoAccept: "false",
    availabilityMode: "flexible",
    timezone: "",
    availabilityWindows: [],
    specificWindows: [],
    selectedSkills: [],
    hiddenDetails: "",
  });

  // Track whether we've initialised form from posting data
  const initialisedRef = useRef(false);

  // Eagerly initialise form when posting data arrives
  useEffect(() => {
    if (!posting || initialisedRef.current) return;
    initialisedRef.current = true;

    const supabase = createClient();
    supabase
      .from("availability_windows")
      .select("*")
      .eq("posting_id", postingId)
      .eq("window_type", "recurring")
      .then(({ data: windowRows }) => {
        const windows: RecurringWindow[] = (windowRows ?? []).map((w) => ({
          window_type: "recurring" as const,
          day_of_week: w.day_of_week!,
          start_minutes: w.start_minutes!,
          end_minutes: w.end_minutes!,
        }));

        queueMicrotask(() => {
          setForm(postingToForm(posting, windows));
        });
      });
  }, [posting, postingId]);

  const { isApplyingUpdate, applyFreeFormUpdate, undoLastUpdate } =
    usePostingAiUpdate(postingId, form, posting?.source_text ?? null, mutate);

  const handleFormChange = (field: keyof PostingFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    triggerSave();
  };

  // Auto-save via PATCH
  const saveFn = useCallback(async () => {
    const res = await fetch(`/api/postings/${postingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.error?.message || "Failed to update posting.");
    }

    mutate();
  }, [postingId, form, mutate]);

  const { saveStatus, triggerSave } = useAutoSave({ saveFn });

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this posting? This action cannot be undone.",
      )
    )
      return;

    setIsDeleting(true);

    try {
      const res = await fetch(`/api/postings/${postingId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message || "Failed to delete posting.");
        setIsDeleting(false);
        return;
      }

      router.push("/my-postings");
    } catch {
      setError("Failed to delete posting. Please try again.");
      setIsDeleting(false);
    }
  };

  const handleExtendDeadline = async (days: number) => {
    setIsExtending(true);
    setError(null);

    try {
      const res = await fetch(`/api/postings/${postingId}/extend-deadline`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message || "Failed to extend deadline.");
        setIsExtending(false);
        return;
      }

      setIsExtending(false);
      mutate();
    } catch {
      setError("Failed to extend deadline. Please try again.");
      setIsExtending(false);
    }
  };

  const handleRepost = async () => {
    setIsReposting(true);
    setError(null);

    try {
      const res = await fetch(`/api/postings/${postingId}/repost`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7 }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error?.message || "Failed to repost.");
        setIsReposting(false);
        return;
      }

      setIsReposting(false);
      mutate();
    } catch {
      setError("Failed to repost. Please try again.");
      setIsReposting(false);
    }
  };

  return {
    // State
    isDeleting,
    isExtending,
    isReposting,
    error,
    setError,
    form,
    setForm,
    saveStatus,
    // AI update
    isApplyingUpdate,
    applyFreeFormUpdate,
    undoLastUpdate,
    // Actions
    handleFormChange,
    handleDelete,
    handleExtendDeadline,
    handleRepost,
  };
}
