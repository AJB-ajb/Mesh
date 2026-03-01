"use client";

import { Info, X } from "lucide-react";
import { labels } from "@/lib/labels";

export interface NudgeItem {
  dimension: string;
  message: string;
  suggestion: string;
}

interface NudgeBannerProps {
  nudges: NudgeItem[];
  onDismiss: (dimension: string) => void;
  onInsertSuggestion: (suggestion: string) => void;
}

const NUDGE_MESSAGES: Record<string, string> = {
  time: labels.nudges.timeMessage,
  location: labels.nudges.locationMessage,
  skills: labels.nudges.skillsMessage,
  team_size: labels.nudges.teamSizeMessage,
  level: labels.nudges.levelMessage,
};

export function nudgeMessage(dimension: string): string {
  return NUDGE_MESSAGES[dimension] ?? "";
}

export function NudgeBanner({
  nudges,
  onDismiss,
  onInsertSuggestion,
}: NudgeBannerProps) {
  // Show max 2 nudges at a time
  const visible = nudges.slice(0, 2);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 animate-in fade-in duration-300">
      {visible.map((nudge) => (
        <div
          key={nudge.dimension}
          className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span className="flex-1">
            {nudge.message}{" "}
            <button
              type="button"
              onClick={() => onInsertSuggestion(nudge.suggestion)}
              className="font-medium underline underline-offset-2 transition-colors hover:text-amber-700 dark:hover:text-amber-100"
            >
              {nudge.suggestion}
            </button>
          </span>
          <button
            type="button"
            onClick={() => onDismiss(nudge.dimension)}
            className="shrink-0 rounded p-0.5 text-amber-500 transition-colors hover:text-amber-700 dark:hover:text-amber-300"
            aria-label={labels.nudges.dismissAriaLabel}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
