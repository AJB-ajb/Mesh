"use client";

import { useState, useEffect, useCallback, useRef } from "react";

type ExtractionStatus = "idle" | "extracting" | "done" | "error";

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
};

type UseExtractionReviewReturn = {
  status: ExtractionStatus;
  extracted: ExtractedFields | null;
  acceptAll: () => Promise<void>;
  acceptField: (field: keyof ExtractedFields) => Promise<void>;
  dismiss: () => void;
  retry: () => void;
};

export function useExtractionReview({
  postingId,
  sourceText,
  shouldExtract,
}: UseExtractionReviewOptions): UseExtractionReviewReturn {
  const [status, setStatus] = useState<ExtractionStatus>("idle");
  const [extracted, setExtracted] = useState<ExtractedFields | null>(null);
  const hasTriggered = useRef(false);

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

      setExtracted({
        category: posting.category || undefined,
        skills: posting.skills || undefined,
        team_size_min: posting.team_size_min || undefined,
        team_size_max: posting.team_size_max || undefined,
        estimated_time: posting.estimated_time || undefined,
        tags: posting.tags || undefined,
      });
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }, [sourceText]);

  // Auto-trigger when shouldExtract is true
  useEffect(() => {
    if (shouldExtract && !hasTriggered.current) {
      hasTriggered.current = true;
      runExtraction();
    }
  }, [shouldExtract, runExtraction]);

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

  const removeQueryParam = useCallback(() => {
    // Remove ?extraction=pending from URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.delete("extraction");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const acceptAll = useCallback(async () => {
    if (!extracted) return;

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

    await patchPosting(fields);
    setExtracted(null);
    setStatus("idle");
    removeQueryParam();
  }, [extracted, patchPosting, removeQueryParam]);

  const acceptField = useCallback(
    async (field: keyof ExtractedFields) => {
      if (!extracted || !extracted[field]) return;

      const fields: Record<string, unknown> = {};
      const value = extracted[field];

      if (field === "skills" || field === "tags") {
        fields[field] = (value as string[]).join(", ");
      } else if (field === "team_size_min" || field === "team_size_max") {
        const key = field === "team_size_min" ? "teamSizeMin" : "teamSizeMax";
        fields[key] = String(value);
      } else if (field === "estimated_time") {
        fields.estimatedTime = value;
      } else {
        fields[field] = value;
      }

      await patchPosting(fields);

      // Remove the accepted field from extracted
      setExtracted((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[field];
        // If no fields remain, dismiss the card
        if (
          Object.keys(next).every(
            (k) => next[k as keyof ExtractedFields] === undefined,
          )
        ) {
          queueMicrotask(() => {
            setStatus("idle");
            removeQueryParam();
          });
        }
        return next;
      });
    },
    [extracted, patchPosting, removeQueryParam],
  );

  const dismiss = useCallback(() => {
    setExtracted(null);
    setStatus("idle");
    removeQueryParam();
  }, [removeQueryParam]);

  const retry = useCallback(() => {
    hasTriggered.current = false;
    runExtraction();
  }, [runExtraction]);

  return { status, extracted, acceptAll, acceptField, dismiss, retry };
}
