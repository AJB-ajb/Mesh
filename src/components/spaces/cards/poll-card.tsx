"use client";

import { Check, X, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { SpaceCard, PollData } from "@/lib/supabase/types";
import { CardDeadlineBadge } from "./card-deadline-badge";

interface PollCardProps {
  card: SpaceCard;
  userId: string | null;
  onVote: (cardId: string, optionIndex: number) => void;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
}

export function PollCard({
  card,
  userId,
  onVote,
  onResolve,
  onCancel,
}: PollCardProps) {
  const data = card.data as PollData;
  const isActive = card.status === "active";
  const isCreator = card.created_by === userId;

  // Total votes across all options
  const totalVotes = data.options.reduce(
    (sum, opt) => sum + opt.votes.length,
    0,
  );

  // Find which option the current user voted for
  const userVoteIndex = data.options.findIndex(
    (opt) => userId && opt.votes.includes(userId),
  );

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="size-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {labels.cards.poll}
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

      {/* Question */}
      <p className="font-medium text-sm mb-3">{data.question}</p>

      {/* Options */}
      <div className="space-y-2">
        {data.options.map((option, idx) => {
          const voteCount = option.votes.length;
          const percentage =
            totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isSelected = idx === userVoteIndex;

          return (
            <button
              key={idx}
              type="button"
              disabled={!isActive || !userId}
              onClick={() => onVote(card.id, idx)}
              className={cn(
                "relative w-full text-left rounded-md border px-3 py-2 text-sm transition-colors overflow-hidden",
                isActive && userId
                  ? "hover:border-primary cursor-pointer"
                  : "cursor-default",
                isSelected ? "border-primary bg-primary/5" : "border-border",
              )}
            >
              {/* Progress bar background */}
              {totalVotes > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {isSelected && (
                    <Check className="size-3.5 text-primary shrink-0" />
                  )}
                  <span>{option.label}</span>
                </span>
                {totalVotes > 0 && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    {voteCount} ({Math.round(percentage)}%)
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {labels.cards.totalVotes(totalVotes)}
        </span>

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
