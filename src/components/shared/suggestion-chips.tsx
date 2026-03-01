"use client";

import { X } from "lucide-react";
import { labels } from "@/lib/labels";
import type { SuggestionChip } from "@/lib/hooks/use-posting-suggestions";

interface SuggestionChipsProps {
  chips: SuggestionChip[];
  onChipClick: (chip: SuggestionChip) => void;
  onDismiss: () => void;
}

export function SuggestionChips({
  chips,
  onChipClick,
  onDismiss,
}: SuggestionChipsProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 animate-in fade-in duration-300 scrollbar-hide">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => onChipClick(chip)}
          className="shrink-0 snap-start rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          {chip.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto shrink-0 snap-end rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
        aria-label={labels.suggestions.dismissAriaLabel}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
