"use client";

import {
  X,
  BarChart3,
  Clock,
  UserCheck,
  ListTodo,
  MapPin,
  Loader2,
} from "lucide-react";

import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { SpaceCardType } from "@/lib/supabase/types";

const typeIcons = {
  poll: BarChart3,
  time_proposal: Clock,
  rsvp: UserCheck,
  task_claim: ListTodo,
  location: MapPin,
} as const;

const typeLabels = {
  poll: labels.cards.poll,
  time_proposal: labels.cards.timeProposal,
  rsvp: labels.cards.rsvp,
  task_claim: labels.cards.taskClaim,
  location: labels.cards.location,
} as const;

interface CardTypeChipsProps {
  plausibleTypes: SpaceCardType[];
  contextMessage?: string;
  loadingType?: SpaceCardType | null;
  onSelectType: (cardType: SpaceCardType) => void;
  onDismiss: () => void;
}

export function CardTypeChips({
  plausibleTypes,
  contextMessage,
  loadingType,
  onSelectType,
  onDismiss,
}: CardTypeChipsProps) {
  if (plausibleTypes.length === 0) return null;

  return (
    <div
      className="flex items-center gap-2 mb-2 animate-in fade-in slide-in-from-bottom-2 duration-200"
      role="group"
      aria-label={labels.cards.selectCardType}
    >
      {contextMessage && (
        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
          {contextMessage}
        </span>
      )}

      {plausibleTypes.map((cardType) => {
        const Icon = typeIcons[cardType];
        const isLoading = loadingType === cardType;
        const isDisabled = loadingType != null && !isLoading;

        return (
          <button
            key={cardType}
            type="button"
            disabled={isDisabled || isLoading}
            onClick={() => onSelectType(cardType)}
            className="flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Icon className="size-3.5" />
            )}
            {typeLabels[cardType]}
          </button>
        );
      })}

      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={onDismiss}
        aria-label={labels.cards.suggestionChipDismiss}
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
