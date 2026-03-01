"use client";

import { labels } from "@/lib/labels";
import { FreeFormUpdate } from "@/components/shared/free-form-update";
import { usePostingDetailContext } from "./posting-detail-context";
import { PostingAboutCard } from "@/components/posting/posting-about-card";
import { PostingSidebar } from "@/components/posting/posting-sidebar";

export function PostingEditTab() {
  const {
    posting,
    postingId,
    form,
    onFormChange,
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

        {/* Hidden details textarea */}
        <div className="space-y-2">
          <label
            htmlFor="hidden-details-edit"
            className="text-sm font-medium leading-none"
          >
            {labels.hiddenDetails.fieldLabel}
          </label>
          <textarea
            id="hidden-details-edit"
            value={form.hiddenDetails}
            onChange={(e) => onFormChange("hiddenDetails", e.target.value)}
            placeholder={labels.hiddenDetails.fieldPlaceholder}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {labels.hiddenDetails.fieldHelp}
          </p>
        </div>
      </div>

      <PostingSidebar />
    </div>
  );
}
