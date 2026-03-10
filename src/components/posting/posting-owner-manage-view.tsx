"use client";

import { useState, useCallback } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { FreeFormUpdate } from "@/components/shared/free-form-update";
import { usePostingCoreContext } from "./posting-core-context";
import { usePostingEditContext } from "./posting-edit-context";
import { PostingSidebar } from "./posting-sidebar";
import { PostingContextBar, type ContextBarState } from "./posting-context-bar";
import { PostingApplicationsCard } from "./posting-applications-card";
import { PostingMatchedProfilesCard } from "./posting-matched-profiles-card";
import { SequentialInviteCard } from "./sequential-invite-card";

function defaultExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export function PostingOwnerManageView() {
  const { posting, postingId, currentUserId } = usePostingCoreContext();
  const { isApplyingUpdate, onApplyUpdate, onUndoUpdate, onFormChange } =
    usePostingEditContext();

  const [showEdit, setShowEdit] = useState(false);

  // Build context bar state from existing posting data
  const [contextBar, setContextBar] = useState<ContextBarState>(() => ({
    parentPostingId: posting.parent_posting_id ?? "",
    parentPostingTitle: null,
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

  const handleContextBarChange = useCallback(
    (newState: ContextBarState) => {
      setContextBar(newState);
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
        {/* 1. Invite progress */}
        {currentUserId && (
          <SequentialInviteCard
            postingId={postingId}
            currentUserId={currentUserId}
          />
        )}

        {/* 2. Join requests */}
        <PostingApplicationsCard />

        {/* 3. Edit section (collapsible) */}
        <div>
          <button
            type="button"
            onClick={() => setShowEdit(!showEdit)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                showEdit && "rotate-180",
              )}
            />
            {labels.postingDetail.editPosting}
          </button>
          {showEdit && (
            <div className="space-y-6 mt-2">
              <FreeFormUpdate
                entityType="posting"
                entityId={postingId}
                sourceText={posting.source_text ?? null}
                canUndo={!!posting.previous_source_text}
                isApplying={isApplyingUpdate}
                onUpdate={onApplyUpdate}
                onUndo={onUndoUpdate}
              />
              <PostingContextBar
                state={contextBar}
                onChange={handleContextBarChange}
                currentUserId={currentUserId ?? undefined}
              />
            </div>
          )}
        </div>

        {/* 4. Matched profiles */}
        <PostingMatchedProfilesCard />
      </div>

      {/* Sidebar: hidden for owners on mobile */}
      <div className="hidden lg:block">
        <PostingSidebar />
      </div>
    </div>
  );
}
