"use client";

import type { ActivityCardWithDetails, ActivityCardStatus } from "@/lib/supabase/types";
import { ActivityCard } from "./activity-card";

interface ActivityFeedProps {
  cards: ActivityCardWithDetails[];
  onAction: (cardId: string, status: ActivityCardStatus) => Promise<boolean>;
}

export function ActivityFeed({ cards, onAction }: ActivityFeedProps) {
  return (
    <div className="space-y-3">
      {cards.map((card) => (
        <ActivityCard key={card.id} card={card} onAction={onAction} />
      ))}
    </div>
  );
}
