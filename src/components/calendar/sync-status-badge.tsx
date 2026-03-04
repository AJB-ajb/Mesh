"use client";

import { Badge } from "@/components/ui/badge";
import { labels } from "@/lib/labels";
import type { CalendarConnection } from "@/lib/calendar/types";

export function SyncStatusBadge({ conn }: { conn: CalendarConnection }) {
  const variant =
    conn.syncStatus === "synced"
      ? "default"
      : conn.syncStatus === "error"
        ? "destructive"
        : "secondary";
  return (
    <Badge variant={variant} className="text-xs">
      {labels.calendar.syncStatusLabels[conn.syncStatus]}
    </Badge>
  );
}
