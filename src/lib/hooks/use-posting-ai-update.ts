"use client";

import type { KeyedMutator } from "swr";
import type { PostingFormState, ExtractedPosting } from "@/lib/types/posting";
import type { PostingDetailData } from "./use-posting-detail";
import { useAiUpdate, type AiUpdateConfig } from "./use-ai-update";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parseList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function buildPostingConfig(
  postingId: string,
): AiUpdateConfig<PostingFormState, ExtractedPosting> {
  return {
    table: "postings",
    rowColumn: "id",
    rowId: postingId,
    snapshotColumn: "previous_posting_snapshot",
    useUpsert: false,

    buildSnapshot: (form) => ({
      title: form.title,
      description: form.description,
      category: form.category,
      estimated_time: form.estimatedTime,
      team_size_max: parseInt(form.lookingFor, 10) || 5,
      tags: form.tags ? parseList(form.tags) : [],
      context_identifier: form.contextIdentifier || null,
      mode: form.mode,
    }),

    buildExtractedFields: (extracted) => ({
      ...(extracted.title != null && { title: extracted.title }),
      ...(extracted.description != null && {
        description: extracted.description,
      }),
      ...(extracted.category != null && { category: extracted.category }),
      ...(extracted.estimated_time != null && {
        estimated_time: extracted.estimated_time,
      }),
      ...(extracted.team_size_max != null && {
        team_size_max: extracted.team_size_max,
      }),
      ...(extracted.tags != null && { tags: extracted.tags }),
      ...(extracted.context_identifier != null && {
        context_identifier: extracted.context_identifier,
      }),
      ...(extracted.mode != null && { mode: extracted.mode }),
    }),

    buildRestoredFields: (snapshot) => ({
      ...(snapshot.title != null && { title: snapshot.title }),
      ...(snapshot.description != null && {
        description: snapshot.description,
      }),
      ...(snapshot.category != null && { category: snapshot.category }),
      ...(snapshot.estimated_time != null && {
        estimated_time: snapshot.estimated_time,
      }),
      ...(snapshot.team_size_max != null && {
        team_size_max: snapshot.team_size_max,
      }),
      ...(snapshot.tags != null && { tags: snapshot.tags }),
      ...(snapshot.context_identifier != null && {
        context_identifier: snapshot.context_identifier,
      }),
      ...(snapshot.mode != null && { mode: snapshot.mode }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePostingAiUpdate(
  postingId: string,
  currentForm: PostingFormState,
  sourceText: string | null,
  mutate: KeyedMutator<PostingDetailData>,
) {
  const config = buildPostingConfig(postingId);
  return useAiUpdate<PostingFormState, ExtractedPosting>(
    currentForm,
    sourceText,
    mutate as KeyedMutator<unknown>,
    config,
  );
}
