"use client";

import { Check, X, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { SpaceCard, TimeProposalData } from "@/lib/supabase/types";
import { CardDeadlineBadge } from "./card-deadline-badge";
import type { SpaceMemberWithProfile } from "@/lib/hooks/use-space";

interface TimeProposalCardProps {
  card: SpaceCard;
  userId: string | null;
  members?: SpaceMemberWithProfile[];
  onVote: (cardId: string, optionIndex: number) => void;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
}

export function TimeProposalCard({
  card,
  userId,
  members,
  onVote,
  onResolve,
  onCancel,
}: TimeProposalCardProps) {
  const data = card.data as TimeProposalData;
  const isActive = card.status === "active";
  const isCreator = card.created_by === userId;
  const memberCount = members?.length ?? 0;

  // Find the option with the most votes (consensus indicator)
  const maxVotes = Math.max(...data.options.map((opt) => opt.votes.length), 0);

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Clock className="size-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {labels.cards.timeProposal}
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
      <p className="font-medium text-sm mb-1">{data.title}</p>
      <p className="text-xs text-muted-foreground mb-3">
        {labels.cards.timeProposalHint}
      </p>

      {/* Resolved slot */}
      {card.status === "resolved" && data.resolved_slot && (
        <div className="mb-3 p-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <p className="text-sm font-medium text-green-700 dark:text-green-400">
            {data.resolved_slot}
          </p>
        </div>
      )}

      {/* Time slot options */}
      <div className="space-y-2">
        {data.options.map((option, idx) => {
          const voteCount = option.votes.length;
          const isSelected = userId ? option.votes.includes(userId) : false;
          const isConsensus =
            voteCount > 0 &&
            voteCount === maxVotes &&
            memberCount > 0 &&
            voteCount >= Math.ceil(memberCount / 2);

          return (
            <button
              key={idx}
              type="button"
              disabled={!isActive || !userId}
              onClick={() => onVote(card.id, idx)}
              className={cn(
                "relative w-full text-left rounded-md border px-3 py-2 text-sm transition-colors",
                isActive && userId
                  ? "hover:border-primary cursor-pointer"
                  : "cursor-default",
                isSelected ? "border-primary bg-primary/5" : "border-border",
                isConsensus && isActive && "ring-1 ring-green-500/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  {isSelected && (
                    <Check className="size-3.5 text-primary shrink-0" />
                  )}
                  <span>{option.label}</span>
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Users className="size-3" />
                  {voteCount}
                </span>
              </div>

              {/* Who voted — show names */}
              {voteCount > 0 && members && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {option.votes
                    .map((uid) => {
                      const member = members.find((m) => m.user_id === uid);
                      return member?.profiles?.full_name ?? "Someone";
                    })
                    .join(", ")}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer with invalidation buttons */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {labels.cards.timeProposalVoteHint}
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
