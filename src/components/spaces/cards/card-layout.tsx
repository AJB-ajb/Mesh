"use client";

import { type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import type { SpaceCard } from "@/lib/supabase/types";
import { CardDeadlineBadge } from "./card-deadline-badge";

// ---------------------------------------------------------------------------
// CardHeader
// ---------------------------------------------------------------------------

interface CardHeaderProps {
  icon: ReactNode;
  label: string;
  card: SpaceCard;
}

export function CardHeader({ icon, label, card }: CardHeaderProps) {
  const isActive = card.status === "active";

  return (
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
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
  );
}

// ---------------------------------------------------------------------------
// CardFooter
// ---------------------------------------------------------------------------

interface CardFooterProps {
  card: SpaceCard;
  userId: string | null;
  onResolve: (cardId: string) => void;
  onCancel: (cardId: string) => void;
  /** Hide the resolve button (e.g. task-claim shows it only when claimed) */
  resolveDisabled?: boolean;
  /** Extra content on the left side of the footer */
  extraLeft?: ReactNode;
}

export function CardFooter({
  card,
  userId,
  onResolve,
  onCancel,
  resolveDisabled,
  extraLeft,
}: CardFooterProps) {
  const isActive = card.status === "active";
  const isCreator = card.created_by === userId;

  // Only render footer when there's content to show
  if (!extraLeft && !(isActive && isCreator)) return null;

  return (
    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
      {extraLeft ?? <span />}

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
          {!resolveDisabled && (
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
      )}
    </div>
  );
}
