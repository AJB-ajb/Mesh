"use client";

import type { SpaceCard } from "@/lib/supabase/types";
import type { SpaceMemberWithProfile } from "@/lib/hooks/use-space";
import { PollCard } from "./poll-card";
import { TimeProposalCard } from "./time-proposal-card";

interface SpaceCardInlineProps {
  card: SpaceCard;
  userId: string | null;
  members?: SpaceMemberWithProfile[];
  onVote: (cardId: string, optionIndex: number) => void;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
}

export function SpaceCardInline({
  card,
  userId,
  members,
  onVote,
  onResolve,
  onCancel,
}: SpaceCardInlineProps) {
  switch (card.type) {
    case "poll":
      return (
        <PollCard
          card={card}
          userId={userId}
          onVote={onVote}
          onResolve={onResolve}
          onCancel={onCancel}
        />
      );
    case "time_proposal":
      return (
        <TimeProposalCard
          card={card}
          userId={userId}
          members={members}
          onVote={onVote}
          onResolve={onResolve}
          onCancel={onCancel}
        />
      );
    default:
      return null;
  }
}
