"use client";

import { ListTodo, Hand } from "lucide-react";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { SpaceCard, TaskClaimData } from "@/lib/supabase/types";
import type { SpaceMemberWithProfile } from "@/lib/hooks/use-space";
import { CardHeader, CardFooter } from "./card-layout";

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
      <CardHeader
        icon={<ListTodo className="size-4 text-primary" />}
        label={labels.cards.taskClaim}
        card={card}
      />

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

      <CardFooter
        card={card}
        userId={userId}
        onResolve={onResolve}
        onCancel={onCancel}
        resolveDisabled={!isClaimed}
      />
    </div>
  );
}
