"use client";

import { UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import type { SpaceCard, RsvpData } from "@/lib/supabase/types";
import { CardHeader, CardFooter } from "./card-layout";

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

  // RSVP options are typically [Yes, No, Maybe]
  const yesCount = data.options[0]?.votes.length ?? 0;
  const thresholdMet = yesCount >= data.threshold;

  // Find which option the user selected (single-select)
  const userVoteIndex = data.options.findIndex(
    (opt) => userId && opt.votes.includes(userId),
  );

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
      <CardHeader
        icon={<UserCheck className="size-4 text-primary" />}
        label={labels.cards.rsvp}
        card={card}
      />

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

      <CardFooter
        card={card}
        userId={userId}
        onResolve={onResolve}
        onCancel={onCancel}
      />
    </div>
  );
}
