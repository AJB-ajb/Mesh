"use client";

import { useId } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostingFields {
  category?: string;
  capacity?: number;
  deadline?: string; // ISO date string
  visibility?: "public" | "private";
  autoAccept?: boolean;
  tags?: string[];
}

export const INITIAL_POSTING_FIELDS: PostingFields = {};

interface PostingComposeFieldsProps {
  fields: PostingFields;
  onChange: (fields: PostingFields) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORY_OPTIONS = [
  { value: "project", label: "Project" },
  { value: "study-group", label: "Study Group" },
  { value: "event", label: "Event" },
  { value: "mentorship", label: "Mentorship" },
  { value: "collaboration", label: "Collaboration" },
  { value: "other", label: "Other" },
] as const;

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PostingComposeFields({
  fields,
  onChange,
}: PostingComposeFieldsProps) {
  const id = useId();

  const update = (patch: Partial<PostingFields>) => {
    onChange({ ...fields, ...patch });
  };

  return (
    <details className="group/posting-fields">
      <summary className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground select-none hover:text-foreground transition-colors py-1">
        <ChevronDown className="size-3 transition-transform group-open/posting-fields:rotate-180" />
        Posting details
      </summary>

      <div className="grid grid-cols-1 gap-x-3 gap-y-2 pt-1 pb-1 sm:grid-cols-2">
        {/* Category */}
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${id}-category`}
            className="text-xs text-muted-foreground"
          >
            {labels.spaces.postingCategory}
          </Label>
          <Select
            value={fields.category ?? ""}
            onValueChange={(v) => update({ category: v || undefined })}
          >
            <SelectTrigger
              size="sm"
              id={`${id}-category`}
              className="w-full text-xs"
            >
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Capacity */}
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${id}-capacity`}
            className="text-xs text-muted-foreground"
          >
            {labels.spaces.postingCapacity}
          </Label>
          <Input
            id={`${id}-capacity`}
            type="number"
            min={1}
            max={999}
            placeholder="e.g. 5"
            value={fields.capacity ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              update({ capacity: v ? Number(v) : undefined });
            }}
            className="h-8 text-xs"
          />
        </div>

        {/* Deadline */}
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${id}-deadline`}
            className="text-xs text-muted-foreground"
          >
            {labels.spaces.postingDeadline}
          </Label>
          <Input
            id={`${id}-deadline`}
            type="date"
            value={fields.deadline ?? ""}
            onChange={(e) => update({ deadline: e.target.value || undefined })}
            className="h-8 text-xs"
          />
        </div>

        {/* Visibility */}
        <div className="flex flex-col gap-1">
          <Label
            htmlFor={`${id}-visibility`}
            className="text-xs text-muted-foreground"
          >
            {labels.spaces.postingVisibility}
          </Label>
          <Select
            value={fields.visibility ?? "public"}
            onValueChange={(v) =>
              update({ visibility: v as "public" | "private" })
            }
          >
            <SelectTrigger
              size="sm"
              id={`${id}-visibility`}
              className="w-full text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VISIBILITY_OPTIONS.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  className="text-xs"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tags (full width) */}
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label
            htmlFor={`${id}-tags`}
            className="text-xs text-muted-foreground"
          >
            {labels.spaces.postingTags}
          </Label>
          <Input
            id={`${id}-tags`}
            type="text"
            placeholder="e.g. react, design, ml"
            value={fields.tags?.join(", ") ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              const parsed = raw
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean);
              update({ tags: parsed.length > 0 ? parsed : undefined });
            }}
            className="h-8 text-xs"
          />
        </div>

        {/* Auto-accept */}
        <div className="flex items-center gap-2 sm:col-span-2">
          <Switch
            id={`${id}-auto-accept`}
            size="sm"
            checked={fields.autoAccept ?? false}
            onCheckedChange={(v) => update({ autoAccept: v })}
          />
          <Label
            htmlFor={`${id}-auto-accept`}
            className="text-xs text-muted-foreground cursor-pointer"
          >
            {labels.spaces.postingAutoAccept}
          </Label>
        </div>
      </div>
    </details>
  );
}
