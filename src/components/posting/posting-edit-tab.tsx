"use client";

import { FreeFormUpdate } from "@/components/shared/free-form-update";
import { usePostingDetailContext } from "./posting-detail-context";
import { PostingAboutCard } from "@/components/posting/posting-about-card";
import { PostingSidebar } from "@/components/posting/posting-sidebar";

export function PostingEditTab() {
  const {
    posting,
    postingId,
    isApplyingUpdate,
    onApplyUpdate,
    onUndoUpdate,
  } = usePostingDetailContext();

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

        <PostingAboutCard />
      </div>

      <PostingSidebar />
    </div>
  );
}
