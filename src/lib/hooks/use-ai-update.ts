"use client";

import { useState, useCallback } from "react";
import type { KeyedMutator } from "swr";
import { createClient } from "@/lib/supabase/client";
import { triggerEmbeddingGeneration } from "@/lib/api/trigger-embedding";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Describes how to map from the current form state into DB column names for
 * snapshot purposes, and how to build the upsert/update payload.
 */
export type AiUpdateConfig<TForm, TExtracted> = {
  /** The Supabase table to write to (e.g. "profiles" or "postings") */
  table: string;

  /**
   * The DB column used to identify the row.
   * For profiles: "user_id" (value comes from auth.getUser()).
   * For postings: "id" (value comes from a caller-supplied rowId).
   */
  rowColumn: "user_id" | "id";

  /**
   * When rowColumn is "id", the caller must provide the row's identifier.
   * When rowColumn is "user_id", this is ignored (we use the authed user's id).
   */
  rowId?: string;

  /**
   * The DB snapshot column name that stores the old field values for undo
   * (e.g. "previous_profile_snapshot" or "previous_posting_snapshot").
   */
  snapshotColumn: string;

  /**
   * Build a plain object snapshot of the current form state, keyed by DB
   * column names.
   */
  buildSnapshot: (form: TForm) => Record<string, unknown>;

  /**
   * Build the partial update object from an extracted AI result,
   * null-coalescing each field (only include if non-null).
   */
  buildExtractedFields: (extracted: TExtracted) => Record<string, unknown>;

  /**
   * Build the restore object from a previously stored snapshot record.
   * This mirrors buildExtractedFields but reads from the snapshot shape.
   */
  buildRestoredFields: (
    snapshot: Record<string, unknown>,
  ) => Record<string, unknown>;

  /**
   * Whether to use upsert (with onConflict) instead of update.
   * Profiles use upsert, postings use update + .eq().
   */
  useUpsert: boolean;

  /** Only relevant when useUpsert is true — the conflict column */
  upsertConflict?: string;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAiUpdate<TForm, TExtracted>(
  currentForm: TForm,
  sourceText: string | null,
  mutate: KeyedMutator<unknown>,
  config: AiUpdateConfig<TForm, TExtracted>,
) {
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const applyFreeFormUpdate = useCallback(
    async (updatedText: string, extractedData: TExtracted) => {
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

      const rowId = config.rowColumn === "user_id" ? user.id : config.rowId!;
      const currentSnapshot = config.buildSnapshot(currentForm);
      const extractedFields = config.buildExtractedFields(extractedData);

      const payload = {
        source_text: updatedText,
        previous_source_text: sourceText ?? null,
        [config.snapshotColumn]: currentSnapshot,
        ...extractedFields,
        updated_at: new Date().toISOString(),
      };

      let writeError: { message: string } | null = null;

      if (config.useUpsert) {
        const { error: upsertError } = await supabase
          .from(config.table)
          .upsert(
            { [config.rowColumn]: rowId, ...payload },
            { onConflict: config.upsertConflict ?? config.rowColumn },
          );
        writeError = upsertError;
      } else {
        const { error: updateError } = await supabase
          .from(config.table)
          .update(payload)
          .eq(config.rowColumn, rowId);
        writeError = updateError;
      }

      setIsApplyingUpdate(false);

      if (writeError) {
        setError("Failed to save update. Please try again.");
        return;
      }

      triggerEmbeddingGeneration();

      setSuccess(true);
      await mutate();
    },
    [currentForm, sourceText, mutate, config],
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

    const rowId = config.rowColumn === "user_id" ? user.id : config.rowId!;

    // Fetch the previous snapshot from DB
    const { data: rowData } = await supabase
      .from(config.table)
      .select(`previous_source_text, ${config.snapshotColumn}`)
      .eq(config.rowColumn, rowId)
      .single();

    const typedRowData = rowData as Record<string, unknown> | null;

    if (!typedRowData?.previous_source_text) {
      setIsApplyingUpdate(false);
      setError("Nothing to undo.");
      return;
    }

    const snapshot = (typedRowData[config.snapshotColumn] ?? {}) as Record<
      string,
      unknown
    >;
    const restoredFields = config.buildRestoredFields(snapshot);

    const restorePayload = {
      source_text: typedRowData.previous_source_text as string,
      previous_source_text: null,
      [config.snapshotColumn]: null,
      ...restoredFields,
      updated_at: new Date().toISOString(),
    };

    let writeError: { message: string } | null = null;

    if (config.useUpsert) {
      const { error: upsertError } = await supabase
        .from(config.table)
        .upsert(
          { [config.rowColumn]: rowId, ...restorePayload },
          { onConflict: config.upsertConflict ?? config.rowColumn },
        );
      writeError = upsertError;
    } else {
      const { error: updateError } = await supabase
        .from(config.table)
        .update(restorePayload)
        .eq(config.rowColumn, rowId);
      writeError = updateError;
    }

    setIsApplyingUpdate(false);

    if (writeError) {
      setError("Failed to undo. Please try again.");
      return;
    }

    setSuccess(true);
    await mutate();
  }, [mutate, config]);

  return {
    isApplyingUpdate,
    error,
    success,
    applyFreeFormUpdate,
    undoLastUpdate,
  };
}
