"use client";

import { Input } from "@/components/ui/input";
import { labels } from "@/lib/labels";
import type { PostingFormState } from "@/lib/types/posting";

type PostingFormTeamProps = {
  form: PostingFormState;
  onChange: (field: keyof PostingFormState, value: string) => void;
};

export function PostingFormTeam({ form, onChange }: PostingFormTeamProps) {
  return (
    <>
      {/* Team size, Mode, and Expires */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          <label htmlFor="mode" className="text-sm font-medium">
            {labels.postingForm.modeLabel}
          </label>
          <select
            id="mode"
            value={form.mode}
            onChange={(e) => onChange("mode", e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="open">
              {labels.postingForm.modeOptions.open}
            </option>
            <option value="friend_ask">
              {labels.postingForm.modeOptions.friend_ask}
            </option>
          </select>
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
