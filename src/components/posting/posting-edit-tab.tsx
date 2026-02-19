"use client";

import type { PostingFormState } from "@/lib/hooks/use-posting-detail";
import type { PostingDetail } from "@/lib/hooks/use-posting-detail";
import type { ExtractedPosting } from "@/lib/types/posting";
import { FreeFormUpdate } from "@/components/shared/free-form-update";
import { PostingAboutCard } from "@/components/posting/posting-about-card";
import { PostingSidebar } from "@/components/posting/posting-sidebar";

interface PostingEditTabProps {
  posting: PostingDetail;
  postingId: string;
  isOwner: boolean;
  isEditing: boolean;
  form: PostingFormState;
  onFormChange: (field: keyof PostingFormState, value: string) => void;
  onContactCreator: () => void;
  isApplyingUpdate: boolean;
  onApplyUpdate: (
    updatedText: string,
    extracted: ExtractedPosting,
  ) => Promise<void>;
  onUndoUpdate: () => Promise<void>;
}

export function PostingEditTab({
  posting,
  postingId,
  isOwner,
  isEditing,
  form,
  onFormChange,
  onContactCreator,
  isApplyingUpdate,
  onApplyUpdate,
  onUndoUpdate,
}: PostingEditTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-6">
      <div className="space-y-6 lg:col-span-2">
        {!isEditing && (
          <FreeFormUpdate
            entityType="posting"
            entityId={postingId}
            sourceText={posting.source_text ?? null}
            canUndo={!!posting.previous_source_text}
            isApplying={isApplyingUpdate}
            onUpdate={onApplyUpdate}
            onUndo={onUndoUpdate}
          />
        )}

        <PostingAboutCard
          posting={posting}
          isEditing={isEditing}
          form={form}
          onFormChange={onFormChange}
        />
      </div>

      <PostingSidebar
        posting={posting}
        isOwner={isOwner}
        onContactCreator={onContactCreator}
      />
    </div>
  );
}
