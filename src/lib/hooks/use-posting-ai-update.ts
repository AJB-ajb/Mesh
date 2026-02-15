"use client";

import { useState, useCallback } from "react";
import type { KeyedMutator } from "swr";
import { createClient } from "@/lib/supabase/client";
import type { PostingFormState, ExtractedPosting } from "@/lib/types/posting";
import { triggerEmbeddingGeneration } from "@/lib/api/trigger-embedding";
import type { PostingDetailData } from "./use-posting-detail";

export function usePostingAiUpdate(
  postingId: string,
  currentForm: PostingFormState,
  sourceText: string | null,
  mutate: KeyedMutator<PostingDetailData>,
) {
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const applyFreeFormUpdate = useCallback(
    async (updatedText: string, extractedPosting: ExtractedPosting) => {
      setError(null);
      setIsApplyingUpdate(true);

      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setIsApplyingUpdate(false);
        setError("Please sign in again.");
        return;
      }

      // Build snapshot of current posting fields for undo
      const parseList = (value: string) =>
        value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

      const currentSnapshot: Record<string, unknown> = {
        title: currentForm.title,
        description: currentForm.description,
        skills: parseList(currentForm.skills),
        category: currentForm.category,
        estimated_time: currentForm.estimatedTime,
        team_size_max: parseInt(currentForm.lookingFor, 10) || 5,
        skill_level_min: currentForm.skillLevelMin
          ? parseInt(currentForm.skillLevelMin, 10)
          : null,
        tags: currentForm.tags ? parseList(currentForm.tags) : [],
        context_identifier: currentForm.contextIdentifier || null,
        mode: currentForm.mode,
      };

      // Save updated posting + undo data to DB
      const { error: updateError } = await supabase
        .from("postings")
        .update({
          source_text: updatedText,
          previous_source_text: sourceText ?? null,
          previous_posting_snapshot: currentSnapshot,
          ...(extractedPosting.title != null && {
            title: extractedPosting.title,
          }),
          ...(extractedPosting.description != null && {
            description: extractedPosting.description,
          }),
          ...(extractedPosting.skills != null && {
            skills: extractedPosting.skills,
          }),
          ...(extractedPosting.category != null && {
            category: extractedPosting.category,
          }),
          ...(extractedPosting.estimated_time != null && {
            estimated_time: extractedPosting.estimated_time,
          }),
          ...(extractedPosting.team_size_max != null && {
            team_size_max: extractedPosting.team_size_max,
          }),
          ...(extractedPosting.skill_level_min != null && {
            skill_level_min: extractedPosting.skill_level_min,
          }),
          ...(extractedPosting.tags != null && {
            tags: extractedPosting.tags,
          }),
          ...(extractedPosting.context_identifier != null && {
            context_identifier: extractedPosting.context_identifier,
          }),
          ...(extractedPosting.mode != null && {
            mode: extractedPosting.mode,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", postingId);

      setIsApplyingUpdate(false);

      if (updateError) {
        setError("Failed to save update. Please try again.");
        return;
      }

      triggerEmbeddingGeneration();

      setSuccess(true);
      await mutate();
    },
    [postingId, currentForm, sourceText, mutate],
  );

  const undoLastUpdate = useCallback(async () => {
    setError(null);
    setIsApplyingUpdate(true);

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsApplyingUpdate(false);
      setError("Please sign in again.");
      return;
    }

    // Fetch the previous snapshot from DB
    const { data: postingData } = await supabase
      .from("postings")
      .select("previous_source_text, previous_posting_snapshot")
      .eq("id", postingId)
      .single();

    if (!postingData?.previous_source_text) {
      setIsApplyingUpdate(false);
      setError("Nothing to undo.");
      return;
    }

    const snapshot = (postingData.previous_posting_snapshot ?? {}) as Record<
      string,
      unknown
    >;

    // Restore previous state
    const { error: updateError } = await supabase
      .from("postings")
      .update({
        source_text: postingData.previous_source_text,
        previous_source_text: null,
        previous_posting_snapshot: null,
        ...(snapshot.title != null && { title: snapshot.title }),
        ...(snapshot.description != null && {
          description: snapshot.description,
        }),
        ...(snapshot.skills != null && { skills: snapshot.skills }),
        ...(snapshot.category != null && { category: snapshot.category }),
        ...(snapshot.estimated_time != null && {
          estimated_time: snapshot.estimated_time,
        }),
        ...(snapshot.team_size_max != null && {
          team_size_max: snapshot.team_size_max,
        }),
        ...(snapshot.skill_level_min != null && {
          skill_level_min: snapshot.skill_level_min,
        }),
        ...(snapshot.tags != null && { tags: snapshot.tags }),
        ...(snapshot.context_identifier != null && {
          context_identifier: snapshot.context_identifier,
        }),
        ...(snapshot.mode != null && { mode: snapshot.mode }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", postingId);

    setIsApplyingUpdate(false);

    if (updateError) {
      setError("Failed to undo. Please try again.");
      return;
    }

    setSuccess(true);
    await mutate();
  }, [postingId, mutate]);

  return {
    isApplyingUpdate,
    error,
    success,
    applyFreeFormUpdate,
    undoLastUpdate,
  };
}
