"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { labels } from "@/lib/labels";
import type { PostingFormState } from "@/lib/types/posting";

type PostingFormBasicProps = {
  form: PostingFormState;
  onChange: (field: keyof PostingFormState, value: string) => void;
};

export function PostingFormBasic({ form, onChange }: PostingFormBasicProps) {
  return (
    <>
      {/* Title */}
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          {labels.postingForm.titleLabel}
        </label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder={labels.postingForm.titlePlaceholder}
          className="text-lg"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-medium">
          {labels.postingForm.descriptionLabel}{" "}
          <span className="text-destructive">*</span>
        </label>
        <Textarea
          id="description"
          rows={6}
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder={labels.postingForm.descriptionPlaceholder}
          enableMic
          onTranscriptionChange={(text) =>
            onChange(
              "description",
              form.description ? form.description + " " + text : text,
            )
          }
        />
        <p className="text-xs text-muted-foreground">
          {labels.extraction.formHint}
        </p>
      </div>
    </>
  );
}
