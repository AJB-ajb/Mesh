"use client";

import type { RecurringWindow } from "@/lib/types/availability";
import { labels } from "@/lib/labels";

const HOUR_HEIGHT = 48; // must match calendar-week-view.tsx

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

type CalendarWeekViewBusyBlockProps = {
  window: RecurringWindow;
  startHour: number;
};

/**
 * Read-only busy block overlay (blue/indigo) for external calendar events.
 * Visually distinct from user-defined unavailable blocks (red).
 */
export function CalendarWeekViewBusyBlock({
  window: w,
  startHour,
}: CalendarWeekViewBusyBlockProps) {
  const startOffset = w.start_minutes - startHour * 60;
  const duration = w.end_minutes - w.start_minutes;
  const top = (startOffset / 60) * HOUR_HEIGHT;
  const height = (duration / 60) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded-sm border border-blue-500/40 bg-blue-500/10 text-xs select-none pointer-events-none"
      style={{ top: `${top}px`, height: `${Math.max(height, 12)}px` }}
      title={labels.calendar.busyBlockLabel}
    >
      <div className="flex items-start px-1 pt-0.5 overflow-hidden">
        <span className="truncate text-[10px] font-medium text-blue-600/70 dark:text-blue-400/70">
          {formatTime(w.start_minutes)}-{formatTime(w.end_minutes)}
        </span>
      </div>
    </div>
  );
}
