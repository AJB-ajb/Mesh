"use client";

import type {
  ActivityCardWithDetails,
  ActivityCardStatus,
} from "@/lib/supabase/types";
import { Stack } from "@/components/ui/stack";
import { ActivityCard } from "./activity-card";

interface ActivityFeedProps {
  cards: ActivityCardWithDetails[];
  onAction: (cardId: string, status: ActivityCardStatus) => Promise<boolean>;
}

export function ActivityFeed({ cards, onAction }: ActivityFeedProps) {
  return (
    <Stack gap="md">
      {cards.map((card) => (
        <ActivityCard key={card.id} card={card} onAction={onAction} />
      ))}
    </Stack>
  );
}
