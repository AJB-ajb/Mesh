"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type ExtractionStatus = "idle" | "extracting" | "applied" | "error";

type ExtractedFields = {
  category?: string;
  skills?: string[];
  team_size_min?: number;
  team_size_max?: number;
  estimated_time?: string;
  tags?: string[];
};

type UseExtractionReviewOptions = {
  postingId: string;
  sourceText: string | null;
  shouldExtract: boolean;
  /** Current posting data — used to snapshot pre-extraction values for undo. */
  currentPosting?: {
    category?: string | null;
    skills?: string[] | null;
    team_size_min?: number | null;
    team_size_max?: number | null;
    estimated_time?: string | null;
    tags?: string[] | null;
  } | null;
  /** Called after auto-apply or undo to refresh SWR data. */
  onMutate?: () => void;
};

export type UseExtractionReviewReturn = {
  status: ExtractionStatus;
  appliedFields: ExtractedFields | null;
  undo: () => Promise<void>;
  dismiss: () => void;
  retry: () => void;
};

/** Auto-dismiss delay in ms. */
const AUTO_DISMISS_MS = 10_000;

export function useExtractionReview({
  postingId,
  sourceText,
  shouldExtract,
  currentPosting,
  onMutate,
}: UseExtractionReviewOptions): UseExtractionReviewReturn {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [appliedFields, setAppliedFields] = useState<ExtractedFields | null>(
    null,
  );
  const snapshotRef = useRef<Record<string, unknown> | null>(null);
  const hasTriggered = useRef(false);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoDismiss = useCallback(() => {
    if (autoDismissTimer.current) {
      clearTimeout(autoDismissTimer.current);
      autoDismissTimer.current = null;
    }
  }, []);

  const startAutoDismiss = useCallback(() => {
    clearAutoDismiss();
    autoDismissTimer.current = setTimeout(() => {
      setStatus("idle");
      setAppliedFields(null);
    }, AUTO_DISMISS_MS);
  }, [clearAutoDismiss]);

  const removeQueryParam = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("extraction");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const patchPosting = useCallback(
    async (fields: Record<string, unknown>) => {
      await fetch(`/api/postings/${postingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
    },
    [postingId],
  );

  /** Build the PATCH payload from extracted fields. */
  const buildPatchPayload = useCallback((extracted: ExtractedFields) => {
    const fields: Record<string, unknown> = {};
    if (extracted.category) fields.category = extracted.category;
    if (extracted.skills) fields.skills = extracted.skills.join(", ");
    if (extracted.team_size_min)
      fields.teamSizeMin = String(extracted.team_size_min);
    if (extracted.team_size_max)
      fields.teamSizeMax = String(extracted.team_size_max);
    if (extracted.estimated_time)
      fields.estimatedTime = extracted.estimated_time;
    if (extracted.tags) fields.tags = extracted.tags.join(", ");
    return fields;
  }, []);

  /** Snapshot current posting values for the fields we're about to overwrite. */
  const takeSnapshot = useCallback(
    (extracted: ExtractedFields) => {
      if (!currentPosting) return;
      const snap: Record<string, unknown> = {};
      if (extracted.category)
        snap.category = currentPosting.category ?? undefined;
      if (extracted.skills)
        snap.skills = currentPosting.skills?.join(", ") ?? "";
      if (extracted.team_size_min)
        snap.teamSizeMin = currentPosting.team_size_min
          ? String(currentPosting.team_size_min)
          : "";
      if (extracted.team_size_max)
        snap.teamSizeMax = currentPosting.team_size_max
          ? String(currentPosting.team_size_max)
          : "";
      if (extracted.estimated_time)
        snap.estimatedTime = currentPosting.estimated_time ?? "";
      if (extracted.tags) snap.tags = currentPosting.tags?.join(", ") ?? "";
      snapshotRef.current = snap;
    },
    [currentPosting],
  );

  const runExtraction = useCallback(async () => {
    if (!sourceText?.trim()) return;

    setStatus("extracting");
    try {
      const res = await fetch("/api/extract/posting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText }),
      });

      if (!res.ok) throw new Error("Extraction failed");

      const data = await res.json();
      const posting = data.posting;

      const extracted: ExtractedFields = {
        category: posting.category || undefined,
        skills: posting.skills || undefined,
        team_size_min: posting.team_size_min || undefined,
        team_size_max: posting.team_size_max || undefined,
        estimated_time: posting.estimated_time || undefined,
        tags: posting.tags || undefined,
      };

      // Snapshot before overwriting
      takeSnapshot(extracted);

      // Auto-apply: PATCH the posting immediately
      const payload = buildPatchPayload(extracted);
      if (Object.keys(payload).length > 0) {
        await patchPosting(payload);
      }

      setAppliedFields(extracted);
      setStatus("applied");
      removeQueryParam();
      onMutate?.();
      startAutoDismiss();
    } catch {
      setStatus("error");
    }
  }, [
    sourceText,
    takeSnapshot,
    buildPatchPayload,
    patchPosting,
    removeQueryParam,
    onMutate,
    startAutoDismiss,
  ]);

  // Auto-trigger when shouldExtract is true
  useEffect(() => {
    if (shouldExtract && !hasTriggered.current) {
      hasTriggered.current = true;
      runExtraction();
    }
  }, [shouldExtract, runExtraction]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => clearAutoDismiss();
  }, [clearAutoDismiss]);

  const undo = useCallback(async () => {
    clearAutoDismiss();
    if (!snapshotRef.current) return;

    await patchPosting(snapshotRef.current);
    snapshotRef.current = null;
    setAppliedFields(null);
    setStatus("idle");
    onMutate?.();
  }, [patchPosting, clearAutoDismiss, onMutate]);

  const dismiss = useCallback(() => {
    clearAutoDismiss();
    setAppliedFields(null);
    setStatus("idle");
  }, [clearAutoDismiss]);

  const retry = useCallback(() => {
    hasTriggered.current = false;
    runExtraction();
  }, [runExtraction]);

  return { status, appliedFields, undo, dismiss, retry };
}
