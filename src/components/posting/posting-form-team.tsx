"use client";

import { Globe, Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { labels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { PostingFormState } from "@/lib/types/posting";

type PostingFormTeamProps = {
  form: PostingFormState;
  onChange: (field: keyof PostingFormState, value: string) => void;
};

export function PostingFormTeam({ form, onChange }: PostingFormTeamProps) {
  return (
    <>
      {/* Visibility toggle */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          {labels.postingForm.visibilityLabel}
        </label>
        <div className="flex rounded-lg border border-input p-1 w-fit">
          <button
            type="button"
            onClick={() => onChange("visibility", "public")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              form.visibility === "public"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Globe className="h-4 w-4" />
            {labels.postingForm.visibilityOptions.public}
          </button>
          <button
            type="button"
            onClick={() => onChange("visibility", "private")}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              form.visibility === "private"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Lock className="h-4 w-4" />
            {labels.postingForm.visibilityOptions.private}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {labels.postingForm.visibilityHelp}
        </p>
      </div>

      {/* Team size and Expires */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="team-size-min" className="text-sm font-medium">
            {labels.postingForm.teamSizeMinLabel}
          </label>
          <Input
            id="team-size-min"
            type="number"
            min={1}
            max={10}
            value={form.teamSizeMin}
            onChange={(e) => onChange("teamSizeMin", e.target.value)}
            placeholder={labels.postingForm.teamSizeMinPlaceholder}
          />
          <p className="text-xs text-muted-foreground">
            {labels.postingForm.teamSizeMinHelp}
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="looking-for" className="text-sm font-medium">
            {labels.postingForm.lookingForLabel}
          </label>
          <Input
            id="looking-for"
            type="number"
            min={1}
            max={10}
            value={form.lookingFor}
            onChange={(e) => onChange("lookingFor", e.target.value)}
            placeholder={labels.postingForm.lookingForPlaceholder}
          />
          <p className="text-xs text-muted-foreground">
            {labels.postingForm.lookingForHelp}
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="expires-at" className="text-sm font-medium">
            {labels.postingForm.expiresOnLabel}
          </label>
          <Input
            id="expires-at"
            type="date"
            value={form.expiresAt}
            onChange={(e) => onChange("expiresAt", e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
          />
          <p className="text-xs text-muted-foreground">
            {labels.postingForm.expiresOnHelp}
          </p>
        </div>
      </div>

      {/* Auto-Accept */}
      <div className="flex items-center gap-3">
        <input
          id="auto-accept"
          type="checkbox"
          checked={form.autoAccept === "true"}
          onChange={(e) =>
            onChange("autoAccept", e.target.checked ? "true" : "false")
          }
          className="h-4 w-4 rounded border border-input"
        />
        <label htmlFor="auto-accept" className="text-sm font-medium">
          {labels.postingForm.autoAcceptLabel}
        </label>
        <p className="text-xs text-muted-foreground">
          {labels.postingForm.autoAcceptHelp}
        </p>
      </div>
    </>
  );
}
