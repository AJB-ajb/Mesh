"use client";

import { labels } from "@/lib/labels";
import type { CalendarVisibility } from "@/lib/calendar/types";

type CalendarVisibilitySectionProps = {
  visibility: CalendarVisibility;
  isUpdating: boolean;
  onChange: (value: CalendarVisibility) => void;
};

const VISIBILITY_OPTIONS = [
  {
    value: "match_only" as const,
    label: labels.calendar.visibilityMatchOnly,
    description: labels.calendar.visibilityMatchOnlyDescription,
  },
  {
    value: "team_visible" as const,
    label: labels.calendar.visibilityTeamVisible,
    description: labels.calendar.visibilityTeamVisibleDescription,
  },
] as const;

export function CalendarVisibilitySection({
  visibility,
  isUpdating,
  onChange,
}: CalendarVisibilitySectionProps) {
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <p className="text-sm font-medium">{labels.calendar.visibilityTitle}</p>
      <p className="text-xs text-muted-foreground">
        {labels.calendar.visibilityDescription}
      </p>
      <div className="flex flex-col gap-2">
        {VISIBILITY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={isUpdating}
            onClick={() => onChange(option.value)}
            className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
              visibility === option.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/30"
            }`}
          >
            <div
              className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
                visibility === option.value
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/40"
              }`}
            >
              {visibility === option.value && (
                <div className="flex h-full items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium">{option.label}</p>
              <p className="text-xs text-muted-foreground">
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
