"use client";

import { useState } from "react";
import { Calendar, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { RichCard } from "./rich-card";
import type { CardData } from "./mock-data";

type TimeProposalCardProps = {
  card: CardData;
};

export function TimeProposalCard({ card }: TimeProposalCardProps) {
  const [votedSlots, setVotedSlots] = useState<Set<string>>(new Set());

  // Trade-off variant
  if (card.tradeOffs) {
    return (
      <RichCard
        icon={<AlertTriangle className="size-4 text-amber-500" />}
        title="No perfect time — pick one"
      >
        <div className="space-y-2">
          {card.tradeOffs.map((option) => (
            <Button
              key={option.label}
              variant="outline"
              className="w-full justify-start text-left h-auto py-2 px-3"
            >
              <div>
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-xs text-muted-foreground">{option.note}</p>
              </div>
            </Button>
          ))}
        </div>
      </RichCard>
    );
  }

  // Standard time proposal
  if (!card.slots) return null;

  const toggleVote = (label: string) => {
    setVotedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  return (
    <RichCard
      icon={<Calendar className="size-4 text-primary" />}
      title="Time proposal"
      resolved={card.resolved}
    >
      <div className="space-y-1.5">
        {card.slots.map((slot) => {
          const isResolved = card.resolved && card.resolvedSlot === slot.label;
          const hasVoted = votedSlots.has(slot.label);
          const displayVotes =
            hasVoted && !slot.votes.includes("Alex")
              ? [...slot.votes, "Alex"]
              : slot.votes;

          return (
            <button
              key={slot.label}
              type="button"
              onClick={() => !card.resolved && toggleVote(slot.label)}
              disabled={card.resolved}
              className={cn(
                "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors text-left min-h-[44px]",
                isResolved
                  ? "bg-green-100 dark:bg-green-900/30"
                  : hasVoted
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-muted/50 hover:bg-muted",
                card.resolved && "cursor-default",
              )}
            >
              {isResolved ? (
                <Check className="size-4 text-green-600 shrink-0" />
              ) : (
                <span
                  className={cn(
                    "size-4 rounded-full border-2 shrink-0",
                    hasVoted
                      ? "bg-primary border-primary"
                      : "border-muted-foreground/30",
                  )}
                />
              )}
              <span className="flex-1 font-medium">{slot.label}</span>
              {displayVotes.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {displayVotes.join(", ")} ({displayVotes.length}/{slot.total})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </RichCard>
  );
}
