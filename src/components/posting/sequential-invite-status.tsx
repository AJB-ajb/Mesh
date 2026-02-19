"use client";

import { CheckCircle2, Circle, Clock, XCircle, ArrowRight } from "lucide-react";

import { labels } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FriendAsk } from "@/lib/supabase/types";

interface SequentialInviteStatusProps {
  friendAsk: FriendAsk;
  /** Map of user_id → display name for connections in the list */
  connectionNames: Record<string, string>;
}

const statusConfig = {
  pending: { label: "In Progress", variant: "secondary" as const },
  accepted: { label: "Accepted", variant: "default" as const },
  completed: { label: "Completed", variant: "outline" as const },
  cancelled: { label: "Cancelled", variant: "destructive" as const },
};

/**
 * Displays the progress of a sequential invite: who was asked,
 * current position, and responses.
 */
export function SequentialInviteStatus({
  friendAsk,
  connectionNames,
}: SequentialInviteStatusProps) {
  const { ordered_friend_list, current_request_index, status } = friendAsk;
  const config = statusConfig[status];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">
          {labels.sequentialInvite.progressTitle}
        </h4>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>

      {/* Timeline */}
      <div className="space-y-1">
        {ordered_friend_list.map((connectionId, index) => {
          const name =
            connectionNames[connectionId] ?? connectionId.slice(0, 8);
          const isCurrent =
            index === current_request_index && status === "pending";
          const isPast = index < current_request_index;
          const isAccepted =
            status === "accepted" && index === current_request_index;

          return (
            <div
              key={connectionId}
              className={cn(
                "flex items-center gap-3 rounded-md p-2 text-sm transition-colors",
                isCurrent && "bg-primary/10 border border-primary/20",
                isAccepted &&
                  "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800",
              )}
            >
              {/* Status icon */}
              {isAccepted ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : isPast ? (
                <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : isCurrent ? (
                <Clock className="h-4 w-4 text-primary shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
              )}

              {/* Position number */}
              <span className="text-muted-foreground w-4 shrink-0">
                {index + 1}
              </span>

              {/* Name */}
              <span
                className={cn(
                  "truncate",
                  isPast && "text-muted-foreground line-through",
                  isCurrent && "font-medium",
                  isAccepted &&
                    "font-medium text-green-700 dark:text-green-400",
                )}
              >
                {name}
              </span>

              {/* Current indicator */}
              {isCurrent && (
                <ArrowRight className="h-3 w-3 text-primary shrink-0 ml-auto" />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground">
        {status === "accepted"
          ? labels.sequentialInvite.acceptedSummary(
              connectionNames[ordered_friend_list[current_request_index]] ??
                "Connection",
            )
          : status === "completed"
            ? labels.sequentialInvite.completedSummary(
                ordered_friend_list.length,
              )
            : status === "cancelled"
              ? labels.sequentialInvite.cancelledSummary
              : labels.sequentialInvite.waitingSummary(
                  current_request_index + 1,
                  ordered_friend_list.length,
                )}
      </p>
    </div>
  );
}
