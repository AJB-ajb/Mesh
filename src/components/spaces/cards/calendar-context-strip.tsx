"use client";

import { useMemo } from "react";
import { useCalendarBusyBlocks } from "@/lib/hooks/use-calendar-busy-blocks";
import { Skeleton } from "@/components/ui/skeleton";
import { labels } from "@/lib/labels";

interface CalendarContextStripProps {
  date: string; // ISO date of the proposed slot
  highlightStart: string; // ISO datetime — start of proposed slot
  highlightEnd: string; // ISO datetime — end of proposed slot
  profileId: string; // current user's profile ID
}

/** Default visible range: 7:00–23:00 (in minutes from midnight) */
const DEFAULT_RANGE_START = 420; // 7 * 60
const DEFAULT_RANGE_END = 1380; // 23 * 60

/**
 * Convert a JS Date.getUTCDay() (0=Sun..6=Sat) to the RecurringWindow
 * convention (0=Mon..6=Sun). Uses UTC to match busy block canonical ranges.
 */
function jsDayToRecurringDay(jsDay: number): number {
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** Minutes since midnight (UTC) for an ISO datetime string. */
function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** Format minutes-of-day as "HH:MM". */
function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}:${min.toString().padStart(2, "0")}`;
}

export function CalendarContextStrip({
  date,
  highlightStart,
  highlightEnd,
  profileId,
}: CalendarContextStripProps) {
  const { busyWindows, isLoading } = useCalendarBusyBlocks(profileId);

  const parsed = useMemo(() => {
    const d = new Date(date);
    const dayOfWeek = jsDayToRecurringDay(d.getUTCDay());

    const slotStart = minutesOfDay(highlightStart);
    const slotEnd = minutesOfDay(highlightEnd);

    // Extend range if the proposed slot falls outside default waking hours
    const rangeStart = Math.min(DEFAULT_RANGE_START, slotStart);
    const rangeEnd = Math.max(DEFAULT_RANGE_END, slotEnd);
    const rangeSpan = rangeEnd - rangeStart;

    // Filter busy windows to matching day
    const dayBusy = busyWindows.filter((w) => w.day_of_week === dayOfWeek);

    return {
      dayOfWeek,
      slotStart,
      slotEnd,
      rangeStart,
      rangeEnd,
      rangeSpan,
      dayBusy,
    };
  }, [date, highlightStart, highlightEnd, busyWindows]);

  if (isLoading) {
    return (
      <Skeleton
        className="w-full h-6 rounded"
        aria-label={labels.cards.calendarStripLoading}
      />
    );
  }

  const { slotStart, slotEnd, rangeStart, rangeSpan, rangeEnd, dayBusy } =
    parsed;

  /** Convert a minute value to a percentage position within the visible range. */
  const toPercent = (m: number) =>
    rangeSpan > 0
      ? ((Math.max(rangeStart, Math.min(rangeEnd, m)) - rangeStart) /
          rangeSpan) *
        100
      : 0;

  return (
    <div
      className="relative w-full h-6 rounded bg-muted/30 overflow-hidden"
      role="img"
      aria-label={labels.cards.calendarStripLabel}
    >
      {/* Busy blocks */}
      {dayBusy.map((w, i) => {
        const left = toPercent(w.start_minutes);
        const right = toPercent(w.end_minutes);
        return (
          <div
            key={i}
            className="absolute inset-y-0 bg-muted-foreground/20 rounded-sm"
            style={{ left: `${left}%`, width: `${right - left}%` }}
          />
        );
      })}

      {/* Proposed slot highlight */}
      <div
        className="absolute inset-y-0 bg-primary/30 border border-primary/50 rounded-sm"
        style={{
          left: `${toPercent(slotStart)}%`,
          width: `${toPercent(slotEnd) - toPercent(slotStart)}%`,
        }}
      >
        {/* Time label on the highlight */}
        <span className="absolute inset-0 flex items-center justify-center text-[0.5625rem] leading-none font-medium text-primary select-none pointer-events-none">
          {formatMinutes(slotStart)}
        </span>
      </div>

      {/* Range start label */}
      <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[0.5rem] leading-none text-muted-foreground select-none pointer-events-none">
        {formatMinutes(rangeStart)}
      </span>

      {/* Range end label */}
      <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[0.5rem] leading-none text-muted-foreground select-none pointer-events-none">
        {formatMinutes(rangeEnd)}
      </span>
    </div>
  );
}
