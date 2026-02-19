"use client";

import { Input } from "@/components/ui/input";
import { labels } from "@/lib/labels";
import type { PostingFormState } from "@/lib/types/posting";

type PostingFormMetaProps = {
  form: PostingFormState;
  onChange: (field: keyof PostingFormState, value: string) => void;
};

export function PostingFormMeta({ form, onChange }: PostingFormMetaProps) {
  return (
    <>
      {/* Tags */}
      <div className="space-y-2">
        <label htmlFor="tags" className="text-sm font-medium">
          {labels.postingForm.tagsLabel}
        </label>
        <Input
          id="tags"
          value={form.tags}
          onChange={(e) => onChange("tags", e.target.value)}
          placeholder={labels.postingForm.tagsPlaceholder}
        />
        <p className="text-xs text-muted-foreground">
          {labels.postingForm.tagsHelp}
        </p>
      </div>

      {/* Estimated Time and Category */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="estimated-time" className="text-sm font-medium">
            {labels.postingForm.estimatedTimeLabel}
          </label>
          <Input
            id="estimated-time"
            value={form.estimatedTime}
            onChange={(e) => onChange("estimatedTime", e.target.value)}
            placeholder={labels.postingForm.estimatedTimePlaceholder}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium">
            {labels.postingForm.categoryLabel}
          </label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => onChange("category", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="study">
              {labels.postingForm.categoryOptions.study}
            </option>
            <option value="hackathon">
              {labels.postingForm.categoryOptions.hackathon}
            </option>
            <option value="personal">
              {labels.postingForm.categoryOptions.personal}
            </option>
            <option value="professional">
              {labels.postingForm.categoryOptions.professional}
            </option>
            <option value="social">
              {labels.postingForm.categoryOptions.social}
            </option>
          </select>
        </div>
      </div>

      {/* Context Identifier */}
      <div className="space-y-2">
        <label htmlFor="context-identifier" className="text-sm font-medium">
          {labels.postingForm.contextLabel}
        </label>
        <Input
          id="context-identifier"
          value={form.contextIdentifier}
          onChange={(e) => onChange("contextIdentifier", e.target.value)}
          placeholder={labels.postingForm.contextPlaceholder}
        />
        <p className="text-xs text-muted-foreground">
          {labels.postingForm.contextHelp}
        </p>
      </div>
    </>
  );
}
