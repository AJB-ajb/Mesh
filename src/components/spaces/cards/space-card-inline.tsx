"use client";

import type { SpaceCard } from "@/lib/supabase/types";
import { PollCard } from "./poll-card";

interface SpaceCardInlineProps {
  card: SpaceCard;
  userId: string | null;
  onVote: (cardId: string, optionIndex: number) => void;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
}

export function SpaceCardInline({
  card,
  userId,
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
    // Future card types will be added here
    default:
      return null;
  }
}
