"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichCard } from "./rich-card";
import type { CardData } from "./mock-data";

type PollCardProps = {
  card: CardData;
};

export function PollCard({ card }: PollCardProps) {
  const [voted, setVoted] = useState<string | null>(null);

  if (!card.pollOptions) return null;

  const totalVotes =
    card.pollOptions.reduce((sum, o) => sum + o.votes, 0) + (voted ? 1 : 0);
  const maxVotes = Math.max(
    ...card.pollOptions.map((o) => (o.label === voted ? o.votes + 1 : o.votes)),
  );

  return (
    <RichCard
      icon={<BarChart3 className="size-4 text-primary" />}
      title={card.pollQuestion ?? "Poll"}
    >
      <div className="space-y-1.5">
        {card.pollOptions.map((option) => {
          const voteCount =
            option.label === voted ? option.votes + 1 : option.votes;
          const pct = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
          const isLeading = voteCount === maxVotes && voteCount > 0;
          const isSelected = voted === option.label;

          return (
            <button
              key={option.label}
              type="button"
              onClick={() =>
                setVoted((prev) =>
                  prev === option.label ? null : option.label,
                )
              }
              className={cn(
                "relative flex items-center w-full rounded-lg px-3 py-2 text-sm transition-colors text-left overflow-hidden min-h-[44px]",
                isSelected ? "ring-2 ring-primary/50" : "hover:bg-muted/50",
              )}
            >
              {/* Progress bar */}
              <div
                className={cn(
                  "absolute inset-y-0 left-0 transition-all",
                  isLeading ? "bg-primary/15" : "bg-muted/50",
                )}
                style={{ width: `${pct}%` }}
              />
              <span className="relative flex-1 font-medium">
                {option.label}
              </span>
              <span className="relative text-xs text-muted-foreground ml-2">
                {voteCount} vote{voteCount !== 1 ? "s" : ""}
              </span>
            </button>
          );
        })}
      </div>
    </RichCard>
  );
}
