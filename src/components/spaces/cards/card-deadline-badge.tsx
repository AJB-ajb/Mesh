"use client";

import { Timer } from "lucide-react";

interface CardDeadlineBadgeProps {
  deadline: string;
}

/**
 * Shows a deadline indicator on active cards.
 * - If deadline < 24h away: "Closes in 8h" (relative)
 * - If deadline >= 24h away: "Closes Fri 18:00" (absolute)
 */
export function CardDeadlineBadge({ deadline }: CardDeadlineBadgeProps) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();

  // Don't show if deadline already passed
  if (diffMs <= 0) return null;

  const diffHours = diffMs / (1000 * 60 * 60);
  const isUrgent = diffHours < 2;

  let label: string;
  if (diffHours < 24) {
    // Relative time
    if (diffHours < 1) {
      const mins = Math.max(1, Math.round(diffMs / (1000 * 60)));
      label = `Closes in ${mins}m`;
    } else {
      const hours = Math.round(diffHours);
      label = `Closes in ${hours}h`;
    }
  } else {
    // Absolute time: "Closes Fri 18:00"
    const dayName = deadlineDate.toLocaleDateString("en-US", {
      weekday: "short",
    });
    const time = deadlineDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    label = `Closes ${dayName} ${time}`;
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
        isUrgent
          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      <Timer className="size-3" />
      {label}
    </span>
  );
}
