"use client";

import { X, BarChart3, Clock, UserCheck, ListTodo } from "lucide-react";

import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { CardSuggestion } from "@/lib/ai/card-suggest";

const typeIcons = {
  poll: BarChart3,
  time_proposal: Clock,
  rsvp: UserCheck,
  task_claim: ListTodo,
} as const;

const typeLabels = {
  poll: labels.cards.poll,
  time_proposal: labels.cards.timeProposal,
  rsvp: labels.cards.rsvp,
  task_claim: labels.cards.taskClaim,
} as const;

/** Build a compact preview string for the suggestion chip */
function buildPreview(suggestion: CardSuggestion): string | null {
  const { prefill, suggested_type } = suggestion;
  if (suggested_type === "time_proposal" || suggested_type === "rsvp") {
    if (prefill.slots && prefill.slots.length > 0) {
      return prefill.slots.map((s) => s.label).join(" · ");
    }
  }
  if (suggested_type === "poll" || suggested_type === "task_claim") {
    if (prefill.options && prefill.options.length > 0) {
      return prefill.options.join(" · ");
    }
  }
  return null;
}

interface CardSuggestionChipProps {
  suggestion: CardSuggestion;
  onAccept: (suggestion: CardSuggestion) => void;
  onDismiss: () => void;
}

export function CardSuggestionChip({
  suggestion,
  onAccept,
  onDismiss,
}: CardSuggestionChipProps) {
  if (!suggestion.suggested_type) return null;

  const Icon = typeIcons[suggestion.suggested_type];
  const typeLabel = typeLabels[suggestion.suggested_type];
  const preview = buildPreview(suggestion);

  return (
    <div className="flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <button
        type="button"
        onClick={() => onAccept(suggestion)}
        className="flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm font-medium hover:bg-primary/20 transition-colors"
      >
        <Icon className="size-3.5" />
        {labels.cards.suggestionChipCreate(typeLabel)}
      </button>
      {preview ? (
        <span className="text-xs text-muted-foreground truncate max-w-[250px]">
          {preview}
        </span>
      ) : (
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {suggestion.reason}
        </span>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="size-6 shrink-0"
        onClick={onDismiss}
        aria-label={labels.cards.suggestionChipDismiss}
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
