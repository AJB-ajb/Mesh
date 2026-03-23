"use client";

import { Check, X, ListTodo, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { SpaceCard, TaskClaimData } from "@/lib/supabase/types";
import { CardDeadlineBadge } from "./card-deadline-badge";
import type { SpaceMemberWithProfile } from "@/lib/hooks/use-space";

interface TaskClaimCardProps {
  card: SpaceCard;
  userId: string | null;
  members?: SpaceMemberWithProfile[];
  onVote: (cardId: string, optionIndex: number) => void;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
}

export function TaskClaimCard({
  card,
  userId,
  members,
  onVote,
  onResolve,
  onCancel,
}: TaskClaimCardProps) {
  const data = card.data as TaskClaimData;
  const isActive = card.status === "active";
  const isCreator = card.created_by === userId;
  // Claimer is the first voter on the single "Claim" option
  const claimerId = data.claimed_by ?? (data.options?.[0]?.votes?.[0] || null);
  const isClaimed = !!claimerId;
  const claimerName = isClaimed
    ? (members?.find((m) => m.user_id === claimerId)?.profiles?.full_name ??
      "Someone")
    : null;
  const isClaimedByMe = claimerId === userId;

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <ListTodo className="size-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {labels.cards.taskClaim}
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

      {/* Task description */}
      <p className="text-sm mb-3">{data.description}</p>

      {/* Claim state */}
      {isClaimed ? (
        <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
          <Hand className="size-4 text-primary" />
          <span className="text-sm">
            {isClaimedByMe
              ? labels.cards.taskClaimedByYou
              : labels.cards.taskClaimedBy(claimerName!)}
          </span>
        </div>
      ) : (
        isActive &&
        userId && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onVote(card.id, 0)}
          >
            <Hand className="size-4 mr-2" />
            {labels.cards.taskClaimButton}
          </Button>
        )
      )}

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
            {isClaimed && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onResolve(card.id)}
              >
                <Check className="size-3 mr-1" />
                {labels.cards.resolveCard}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
