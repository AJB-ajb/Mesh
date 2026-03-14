"use client";

import { Users, UserPlus, Calendar, Mail, Check, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { labels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTimeAgoShort } from "@/lib/format";
import type {
  ActivityCardWithDetails,
  ActivityCardType,
  ActivityCardStatus,
} from "@/lib/supabase/types";

interface ActivityCardProps {
  card: ActivityCardWithDetails;
  onAction: (cardId: string, status: ActivityCardStatus) => Promise<boolean>;
}

const typeConfig: Record<
  ActivityCardType,
  {
    icon: typeof Star;
    color: string;
    badgeVariant: "default" | "secondary" | "info" | "success" | "warning";
  }
> = {
  match: { icon: Star, color: "text-cat-match", badgeVariant: "warning" },
  invite: { icon: Mail, color: "text-info", badgeVariant: "info" },
  scheduling: {
    icon: Calendar,
    color: "text-cat-scheduling",
    badgeVariant: "success",
  },
  connection_request: {
    icon: UserPlus,
    color: "text-cat-hackathon",
    badgeVariant: "secondary",
  },
  rsvp: { icon: Check, color: "text-info", badgeVariant: "info" },
  join_request: {
    icon: Users,
    color: "text-cat-professional",
    badgeVariant: "warning",
  },
};

function getActions(
  cardType: ActivityCardType,
): { label: string; status: ActivityCardStatus }[][] {
  switch (cardType) {
    case "match":
      return [
        [
          { label: labels.activity.actions.join, status: "acted" },
          { label: labels.activity.actions.pass, status: "dismissed" },
        ],
      ];
    case "invite":
      return [
        [
          { label: labels.activity.actions.join, status: "acted" },
          { label: labels.activity.actions.decline, status: "dismissed" },
        ],
      ];
    case "connection_request":
      return [
        [
          { label: labels.activity.actions.accept, status: "acted" },
          { label: labels.activity.actions.decline, status: "dismissed" },
        ],
      ];
    case "join_request":
      return [
        [
          { label: labels.activity.actions.accept, status: "acted" },
          { label: labels.activity.actions.decline, status: "dismissed" },
        ],
      ];
    case "scheduling":
    case "rsvp":
      return [
        [
          { label: labels.activity.actions.confirm, status: "acted" },
          { label: labels.activity.actions.dismiss, status: "dismissed" },
        ],
      ];
    default:
      return [
        [{ label: labels.activity.actions.dismiss, status: "dismissed" }],
      ];
  }
}

export function ActivityCard({ card, onAction }: ActivityCardProps) {
  const config = typeConfig[card.type] ?? typeConfig.match;
  const Icon = config.icon;
  const actions = card.status === "pending" ? getActions(card.type) : [];
  const isActed = card.status !== "pending";

  const fromName = card.from_profile?.full_name ?? "Someone";
  const postingPreview = card.space_posting?.text
    ? card.space_posting.text.slice(0, 80) +
      (card.space_posting.text.length > 80 ? "..." : "")
    : null;

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isActed ? "bg-muted/30 opacity-70" : "bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full bg-muted",
            config.color,
          )}
        >
          <Icon className="size-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={config.badgeVariant} className="text-[10px]">
              {labels.activity.cardTypes[card.type]}
            </Badge>
            {card.score != null && card.score > 0 && (
              <Badge variant="outline" className="text-[10px]">
                {Math.round(card.score * 100)}% match
              </Badge>
            )}
            <RelativeTime
              date={card.created_at}
              formatter={formatTimeAgoShort}
              className="text-xs text-muted-foreground ml-auto shrink-0"
            />
          </div>

          <p className="mt-1 text-sm font-medium">{card.title}</p>
          {card.subtitle && (
            <p className="text-sm text-muted-foreground">{card.subtitle}</p>
          )}

          {/* From user */}
          {card.from_user_id && (
            <p className="mt-1 text-xs text-muted-foreground">
              From {fromName}
            </p>
          )}

          {/* Posting preview */}
          {postingPreview && (
            <p className="mt-1 text-xs text-muted-foreground italic truncate">
              {postingPreview}
            </p>
          )}

          {/* Actions */}
          {actions.length > 0 && actions[0].length > 0 && (
            <div className="mt-3 flex gap-2">
              {actions[0].map((action) => (
                <Button
                  key={action.status}
                  size="sm"
                  variant={action.status === "acted" ? "default" : "outline"}
                  onClick={() => onAction(card.id, action.status)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
