"use client";

import { Check, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import type { SpaceCard, PollData } from "@/lib/supabase/types";
import { CardHeader, CardFooter } from "./card-layout";

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
      <CardHeader
        icon={<BarChart3 className="size-4 text-primary" />}
        label={labels.cards.poll}
        card={card}
      />

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

      <CardFooter
        card={card}
        userId={userId}
        onResolve={onResolve}
        onCancel={onCancel}
        extraLeft={
          <span className="text-xs text-muted-foreground">
            {labels.cards.totalVotes(totalVotes)}
          </span>
        }
      />
    </div>
  );
}
