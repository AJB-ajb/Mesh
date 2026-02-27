"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProfileExtractionStatus = "idle" | "extracting" | "done" | "error";

export type ExtractedProfileFields = {
  full_name?: string;
  headline?: string;
  skills?: string[];
  interests?: string[];
  location?: string;
  languages?: string[];
  bio?: string;
};

type UseProfileExtractionReviewOptions = {
  profileId: string | null;
  sourceText: string;
  shouldExtract: boolean;
};

type UseProfileExtractionReviewReturn = {
  status: ProfileExtractionStatus;
  extracted: ExtractedProfileFields | null;
  acceptAll: () => Promise<void>;
  acceptField: (field: keyof ExtractedProfileFields) => Promise<void>;
  dismiss: () => void;
  retry: () => void;
};

export function useProfileExtractionReview({
  profileId,
  sourceText,
  shouldExtract,
}: UseProfileExtractionReviewOptions): UseProfileExtractionReviewReturn {
  const [status, setStatus] = useState<ProfileExtractionStatus>("idle");
  const [extracted, setExtracted] = useState<ExtractedProfileFields | null>(
    null,
  );
  const hasTriggered = useRef(false);

  const runExtraction = useCallback(async () => {
    if (!sourceText?.trim()) return;

    setStatus("extracting");
    try {
      const res = await fetch("/api/extract/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText }),
      });

      if (!res.ok) throw new Error("Extraction failed");

      const data = await res.json();
      const profile = data.profile;

      setExtracted({
        full_name: profile.full_name || undefined,
        headline: profile.headline || undefined,
        skills:
          profile.skills && profile.skills.length > 0
            ? profile.skills
            : undefined,
        interests:
          profile.interests && profile.interests.length > 0
            ? profile.interests
            : undefined,
        location: profile.location || undefined,
        languages:
          profile.languages && profile.languages.length > 0
            ? profile.languages
            : undefined,
        bio: profile.bio || undefined,
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

  const patchProfile = useCallback(
    async (fields: Record<string, unknown>) => {
      if (!profileId) return;
      const supabase = createClient();
      await supabase
        .from("profiles")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("user_id", profileId);
    },
    [profileId],
  );

  const removeQueryParam = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("extraction");
    window.history.replaceState({}, "", url.toString());
  }, []);

  const acceptAll = useCallback(async () => {
    if (!extracted) return;

    const fields: Record<string, unknown> = {};
    if (extracted.full_name) fields.full_name = extracted.full_name;
    if (extracted.headline) fields.headline = extracted.headline;
    if (extracted.skills) fields.skills = extracted.skills;
    if (extracted.interests) fields.interests = extracted.interests;
    if (extracted.location) fields.location = extracted.location;
    if (extracted.languages) fields.languages = extracted.languages;
    if (extracted.bio) fields.bio = extracted.bio;

    await patchProfile(fields);
    setExtracted(null);
    setStatus("idle");
    removeQueryParam();
  }, [extracted, patchProfile, removeQueryParam]);

  const acceptField = useCallback(
    async (field: keyof ExtractedProfileFields) => {
      if (!extracted || !extracted[field]) return;

      const fields: Record<string, unknown> = {};
      fields[field] = extracted[field];

      await patchProfile(fields);

      // Remove the accepted field from extracted
      setExtracted((prev) => {
        if (!prev) return prev;
        const next = { ...prev };
        delete next[field];
        // If no fields remain, dismiss the card
        if (
          Object.keys(next).every(
            (k) => next[k as keyof ExtractedProfileFields] === undefined,
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
    [extracted, patchProfile, removeQueryParam],
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
