"use client";

import { Check, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { SpaceCard, LocationData } from "@/lib/supabase/types";
import { CardDeadlineBadge } from "./card-deadline-badge";

interface LocationCardProps {
  card: SpaceCard;
  userId: string | null;
  onVote: (cardId: string, optionIndex: number) => void;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
}

export function LocationCard({
  card,
  userId,
  onVote,
  onResolve,
  onCancel,
}: LocationCardProps) {
  const data = card.data as LocationData;
  const isActive = card.status === "active";
  const isCreator = card.created_by === userId;

  // Find which option the user selected
  const userVoteIndex = data.options.findIndex(
    (opt) => userId && opt.votes.includes(userId),
  );

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="size-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {labels.cards.location}
        </span>
        {isActive && card.deadline && (
          <span className="ml-auto">
            <CardDeadlineBadge deadline={card.deadline} />
          </span>
        )}
        {!isActive && (
          <span
            className={cn(
              "ml-auto text-xs font-medium px-2 py-0.5 rounded-full",
              card.status === "resolved"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {card.status === "resolved"
              ? labels.cards.resolved
              : labels.cards.cancelled}
          </span>
        )}
      </div>

      {/* Location label */}
      <p className="font-medium text-sm mb-3">{data.label}</p>

      {/* Response options (Confirm / Suggest different) */}
      <div className="flex gap-2">
        {data.options.map((option, idx) => {
          const isSelected = idx === userVoteIndex;
          return (
            <button
              key={idx}
              type="button"
              disabled={!isActive || !userId}
              onClick={() => onVote(card.id, idx)}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                isActive && userId
                  ? "hover:border-primary cursor-pointer"
                  : "cursor-default",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border",
              )}
            >
              {option.label}
              {option.votes.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({option.votes.length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {isActive && isCreator && (
        <div className="flex items-center justify-end mt-3 pt-2 border-t border-border">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onCancel(card.id)}
            >
              <X className="size-3 mr-1" />
              {labels.cards.cancelCard}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => onResolve(card.id)}
            >
              <Check className="size-3 mr-1" />
              {labels.cards.resolveCard}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
