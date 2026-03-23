"use client";

import type { SpaceCard } from "@/lib/supabase/types";
import type { SpaceMemberWithProfile } from "@/lib/hooks/use-space";
import { PollCard } from "./poll-card";
import { TimeProposalCard } from "./time-proposal-card";
import { RsvpCard } from "./rsvp-card";
import { TaskClaimCard } from "./task-claim-card";
import { LocationCard } from "./location-card";

interface SpaceCardInlineProps {
  card: SpaceCard;
  userId: string | null;
  members?: SpaceMemberWithProfile[];
  onVote: (cardId: string, optionIndex: number) => void;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
  onOptOut?: (cardId: string, reason: "cant_make_any" | "pass") => void;
  onUndoOptOut?: (cardId: string) => void;
  onCommit?: (
    cardId: string,
    commitment: "attending" | "maybe" | "cant_make_it",
  ) => void;
}

export function SpaceCardInline({
  card,
  userId,
  members,
  onVote,
  onResolve,
  onCancel,
  onOptOut,
  onUndoOptOut,
  onCommit,
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
          onOptOut={onOptOut}
          onUndoOptOut={onUndoOptOut}
          onCommit={onCommit}
        />
      );
    case "rsvp":
      return (
        <RsvpCard
          card={card}
          userId={userId}
          onVote={onVote}
          onResolve={onResolve}
          onCancel={onCancel}
        />
      );
    case "task_claim":
      return (
        <TaskClaimCard
          card={card}
          userId={userId}
          members={members}
          onVote={onVote}
          onResolve={onResolve}
          onCancel={onCancel}
        />
      );
    case "location":
      return (
        <LocationCard
          card={card}
          userId={userId}
          onVote={onVote}
          onResolve={onResolve}
          onCancel={onCancel}
        />
      );
    default:
      return null;
  }
}
