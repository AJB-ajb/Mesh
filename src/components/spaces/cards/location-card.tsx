"use client";

import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import type { SpaceCard, LocationData } from "@/lib/supabase/types";
import { CardHeader, CardFooter } from "./card-layout";

interface LocationCardProps {
  card: SpaceCard;
  userId: string | null;
  onVote: (cardId: string, optionIndex: number) => void;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
}

export function LocationCard({
  card,
  userId,
  onVote,
  onResolve,
  onCancel,
}: LocationCardProps) {
  const data = card.data as LocationData;
  const isActive = card.status === "active";

  // Find which option the user selected
  const userVoteIndex = data.options.findIndex(
    (opt) => userId && opt.votes.includes(userId),
  );

  return (
    <div className="mx-auto w-full max-w-md rounded-lg border border-border bg-card p-4 shadow-sm">
      <CardHeader
        icon={<MapPin className="size-4 text-primary" />}
        label={labels.cards.location}
        card={card}
      />

      {/* Location label */}
      <p className="font-medium text-sm mb-3">{data.label}</p>

      {/* Response options (Confirm / Suggest different) */}
      <div className="flex gap-2">
        {data.options.map((option, idx) => {
          const isSelected = idx === userVoteIndex;
          return (
            <button
              key={idx}
              type="button"
              disabled={!isActive || !userId}
              onClick={() => onVote(card.id, idx)}
              className={cn(
                "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                isActive && userId
                  ? "hover:border-primary cursor-pointer"
                  : "cursor-default",
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border",
              )}
            >
              {option.label}
              {option.votes.length > 0 && (
                <span className="ml-1 text-xs text-muted-foreground">
                  ({option.votes.length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      <CardFooter
        card={card}
        userId={userId}
        onResolve={onResolve}
        onCancel={onCancel}
      />
    </div>
  );
}
