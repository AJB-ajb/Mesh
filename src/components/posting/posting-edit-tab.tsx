"use client";

import { useState } from "react";

import type { PostingFormState } from "@/lib/hooks/use-posting-detail";
import type { PostingDetail } from "@/lib/hooks/use-posting-detail";
import type { ExtractedPosting } from "@/lib/types/posting";
import { NlInputPanel } from "@/components/shared/nl-input-panel";
import { PostingAboutCard } from "@/components/posting/posting-about-card";
import { PostingSidebar } from "@/components/posting/posting-sidebar";

interface PostingEditTabProps {
  posting: PostingDetail;
  postingId: string;
  isOwner: boolean;
  form: PostingFormState;
  onFormChange: (field: keyof PostingFormState, value: string) => void;
  onContactCreator: () => void;
  isApplyingUpdate: boolean;
  onApplyUpdate: (
    updatedText: string,
    extracted: ExtractedPosting,
  ) => Promise<void>;
}

export function PostingEditTab({
  posting,
  postingId,
  isOwner,
  form,
  onFormChange,
  onContactCreator,
  isApplyingUpdate,
  onApplyUpdate,
}: PostingEditTabProps) {
  // NL update state — the textarea for posting update instructions
  const [nlText, setNlText] = useState(posting.source_text ?? "");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState(false);

  const handleNlExtract = async () => {
    if (!nlText.trim() || isApplyingUpdate) return;

    setIsExtracting(true);
    setExtractionSuccess(false);

    try {
      const res = await fetch("/api/extract/posting/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postingId,
          sourceText: nlText,
          updateInstruction: nlText,
          currentFields: form as unknown as Record<string, unknown>,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error?.message ?? data.error ?? "Failed to extract update",
        );
      }

      const data = await res.json();
      await onApplyUpdate(data.updatedSourceText, data.extractedPosting);

      setExtractionSuccess(true);
      setTimeout(() => {
        setExtractionSuccess(false);
      }, 1500);
    } catch {
      // Error handling is done by the parent's error state
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3 mt-6">
      <div className="space-y-6 lg:col-span-2">
        {/* NL input panel for update instructions */}
        <NlInputPanel
          nlText={nlText}
          onNlTextChange={setNlText}
          isExtracting={isExtracting || isApplyingUpdate}
          extractionSuccess={extractionSuccess}
          onExtract={handleNlExtract}
          variant="posting"
          isUpdate
        />

        {/* Always-editable form fields */}
        <PostingAboutCard
          posting={posting}
          isEditing={true}
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
