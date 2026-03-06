"use client";

import { useState, useCallback, useEffect } from "react";

import { labels } from "@/lib/labels";
import { FreeFormUpdate } from "@/components/shared/free-form-update";
import { usePostingCoreContext } from "./posting-core-context";
import { usePostingEditContext } from "./posting-edit-context";
import { PostingSidebar } from "./posting-sidebar";
import { PostingContextBar, type ContextBarState } from "./posting-context-bar";

function defaultExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export function PostingEditTab() {
  const { posting, postingId, onMutate } = usePostingCoreContext();
  const { isApplyingUpdate, onApplyUpdate, onUndoUpdate, form, onFormChange } =
    usePostingEditContext();

  // Build context bar state from existing posting data
  const [contextBar, setContextBar] = useState<ContextBarState>(() => ({
    parentPostingId: posting.parent_posting_id ?? "",
    parentPostingTitle: null, // Would need separate fetch
    parentMemberCount: null,
    invitedUsers: [],
    linkToken:
      ((posting as Record<string, unknown>).link_token as string | null) ??
      null,
    inDiscover:
      ((posting as Record<string, unknown>).in_discover as boolean) ??
      posting.visibility === "public",
    settings: {
      teamSizeMin: String(posting.team_size_min ?? 1),
      teamSizeMax: String(posting.team_size_max ?? 5),
      expiresAt: posting.expires_at
        ? new Date(posting.expires_at).toISOString().slice(0, 10)
        : defaultExpiresAt(),
      autoAccept: posting.auto_accept ?? false,
      sequentialCount: 1,
    },
  }));

  // Sync context bar changes back to form state for auto-save
  const handleContextBarChange = useCallback(
    (newState: ContextBarState) => {
      setContextBar(newState);

      // Sync relevant fields to the form for auto-save
      onFormChange("teamSizeMin", newState.settings.teamSizeMin);
      onFormChange("teamSizeMax", newState.settings.teamSizeMax);
      onFormChange("lookingFor", newState.settings.teamSizeMax);
      onFormChange("expiresAt", newState.settings.expiresAt);
      onFormChange(
        "autoAccept",
        newState.settings.autoAccept ? "true" : "false",
      );
      onFormChange("visibility", newState.inDiscover ? "public" : "private");
    },
    [onFormChange],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-6">
      <div className="space-y-6 lg:col-span-2">
        <FreeFormUpdate
          entityType="posting"
          entityId={postingId}
          sourceText={posting.source_text ?? null}
          canUndo={!!posting.previous_source_text}
          isApplying={isApplyingUpdate}
          onUpdate={onApplyUpdate}
          onUndo={onUndoUpdate}
        />

        {/* Context bar (replaces PostingAboutCard) */}
        <PostingContextBar
          state={contextBar}
          onChange={handleContextBarChange}
        />
      </div>

      <PostingSidebar />
    </div>
  );
}
