"use client";

import { Check, X, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { SpaceCard, RsvpData } from "@/lib/supabase/types";
import { CardDeadlineBadge } from "./card-deadline-badge";

interface RsvpCardProps {
  card: SpaceCard;
  userId: string | null;
  onVote: (cardId: string, optionIndex: number) => void;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
}

export function RsvpCard({
  card,
  userId,
  onVote,
  onResolve,
  onCancel,
}: RsvpCardProps) {
  const data = card.data as RsvpData;
  const isActive = card.status === "active";
  const isCreator = card.created_by === userId;

  // RSVP options are typically [Yes, No, Maybe]
  const yesCount = data.options[0]?.votes.length ?? 0;
  const thresholdMet = yesCount >= data.threshold;

  // Find which option the user selected (single-select)
  const userVoteIndex = data.options.findIndex(
    (opt) => userId && opt.votes.includes(userId),
  );

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <UserCheck className="size-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {labels.cards.rsvp}
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

      {/* Title */}
      <p className="font-medium text-sm mb-3">{data.title}</p>

      {/* Threshold indicator */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>{labels.cards.rsvpThreshold(yesCount, data.threshold)}</span>
          {thresholdMet && (
            <span className="text-green-600 dark:text-green-400 font-medium">
              {labels.cards.rsvpThresholdMet}
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              thresholdMet ? "bg-green-500" : "bg-primary",
            )}
            style={{
              width: `${Math.min((yesCount / data.threshold) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Response buttons */}
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
      <div className="flex items-center justify-end mt-3 pt-2 border-t border-border">
        {isActive && isCreator && (
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
        )}
      </div>
    </div>
  );
}
