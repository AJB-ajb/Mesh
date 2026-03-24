"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/lib/hooks/use-is-mobile";
import { useSpaceCalendar } from "@/lib/hooks/use-space-calendar";
import type {
  CalendarFreeSlot,
  CalendarEvent,
} from "@/lib/hooks/use-space-calendar";
import { useCalendarDrag } from "@/components/availability/use-calendar-drag";
import type { RecurringWindow } from "@/lib/types/availability";

// ---------------------------------------------------------------------------
// Constants (match calendar-week-view.tsx)
// ---------------------------------------------------------------------------
const HOUR_HEIGHT = 48;
const START_HOUR = 6; // Show 06:00–23:00 for a cleaner default view
const END_HOUR = 24;
const TOTAL_HOURS = END_HOUR - START_HOUR;

/** Get the Monday of the week containing `date`. */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function formatDayHeader(date: Date): { short: string; date: string } {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    short: days[date.getUTCDay()],
    date: `${date.getUTCDate()}`,
  };
}

function formatWeekRange(start: Date): string {
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getFullYear() &&
    date.getUTCMonth() === now.getMonth() &&
    date.getUTCDate() === now.getDate()
  );
}

/** Check if an ISO datetime falls on a given UTC date. */
function isSameUTCDate(iso: string, date: Date): boolean {
  const d = new Date(iso);
  return (
    d.getUTCFullYear() === date.getUTCFullYear() &&
    d.getUTCMonth() === date.getUTCMonth() &&
    d.getUTCDate() === date.getUTCDate()
  );
}

/** Convert an ISO datetime to minutes since midnight (UTC). */
function isoToMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FreeSlotBlock({
  startMinutes,
  endMinutes,
}: {
  startMinutes: number;
  endMinutes: number;
}) {
  const clampedStart = Math.max(startMinutes, START_HOUR * 60);
  const clampedEnd = Math.min(endMinutes, END_HOUR * 60);
  if (clampedEnd <= clampedStart) return null;

  const top = ((clampedStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded-sm border border-emerald-500/30 bg-emerald-500/10 pointer-events-none"
      style={{ top: `${top}px`, height: `${Math.max(height, 4)}px` }}
    />
  );
}

function EventBlock({
  title,
  startMinutes,
  endMinutes,
}: {
  title: string;
  startMinutes: number;
  endMinutes: number;
}) {
  const clampedStart = Math.max(startMinutes, START_HOUR * 60);
  const clampedEnd = Math.min(endMinutes, END_HOUR * 60);
  if (clampedEnd <= clampedStart) return null;

  const top = ((clampedStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded-sm border border-primary/40 bg-primary/20 pointer-events-none overflow-hidden"
      style={{ top: `${top}px`, height: `${Math.max(height, 16)}px` }}
    >
      <div className="px-1 pt-0.5">
        <span className="truncate text-[10px] font-medium text-primary leading-tight block">
          {title}
        </span>
        {height >= 28 && (
          <span className="text-[9px] text-primary/60 block">
            {formatTime(startMinutes)}–{formatTime(endMinutes)}
          </span>
        )}
      </div>
    </div>
  );
}

function DragPreviewBlock({
  startMinutes,
  endMinutes,
}: {
  startMinutes: number;
  endMinutes: number;
}) {
  const clampedStart = Math.max(startMinutes, START_HOUR * 60);
  const clampedEnd = Math.min(endMinutes, END_HOUR * 60);
  if (clampedEnd <= clampedStart) return null;

  const top = ((clampedStart - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const height = ((clampedEnd - clampedStart) / 60) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded-sm border-2 border-primary/50 bg-primary/15 pointer-events-none"
      style={{ top: `${top}px`, height: `${Math.max(height, 12)}px` }}
    >
      <div className="flex items-start px-1 pt-0.5">
        <span className="text-[10px] font-medium text-primary/70">
          {formatTime(clampedStart)}–{formatTime(clampedEnd)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface SharedCalendarViewProps {
  spaceId: string;
  memberCount: number;
  onCreateCard?: (slot: { start: string; end: string }) => void;
}

export function SharedCalendarView({
  spaceId,
  memberCount,
  onCreateCard,
}: SharedCalendarViewProps) {
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLDivElement>(null);

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [mobilePageIndex, setMobilePageIndex] = useState(0);

  const { freeSlots, events, connectedCalendars, totalMembers, isLoading } =
    useSpaceCalendar(spaceId, true);

  // Build the 7 dates for the current week
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Mobile pages: [0,1,2], [3,4,5], [6]
  const MOBILE_PAGES = [[0, 1, 2], [3, 4, 5], [6]] as const;
  const visibleIndices = isMobile
    ? [...MOBILE_PAGES[mobilePageIndex]]
    : [0, 1, 2, 3, 4, 5, 6];

  // Index free slots and events by date for fast lookup
  const slotsByDate = useMemo(() => {
    const map = new Map<string, CalendarFreeSlot[]>();
    for (const slot of freeSlots) {
      const key = slot.start.slice(0, 10); // YYYY-MM-DD
      let list = map.get(key);
      if (!list) {
        list = [];
        map.set(key, list);
      }
      list.push(slot);
    }
    return map;
  }, [freeSlots]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ev.start.slice(0, 10);
      let list = map.get(key);
      if (!list) {
        list = [];
        map.set(key, list);
      }
      list.push(ev);
    }
    return map;
  }, [events]);

  // Drag-to-create: use the existing hook with an empty windows array (read-only calendar)
  // We only care about the "create" mode to capture drag ranges.
  const dummyWindows: RecurringWindow[] = [];
  const handleDragChange = useCallback(
    (newWindows: RecurringWindow[]) => {
      if (!onCreateCard || newWindows.length === 0) return;
      // The new window is the drag result — convert to an ISO slot
      const w = newWindows[newWindows.length - 1];
      const dayIndex = w.day_of_week; // 0–6 maps to our weekDates index
      const date = weekDates[dayIndex];
      if (!date) return;

      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0);
      startDate.setUTCMinutes(w.start_minutes);

      const endDate = new Date(date);
      endDate.setUTCHours(0, 0, 0, 0);
      endDate.setUTCMinutes(w.end_minutes);

      onCreateCard({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      });
    },
    [onCreateCard, weekDates],
  );

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    previewWindow,
  } = useCalendarDrag(dummyWindows, handleDragChange);

  const onColumnPointerDown = (e: React.PointerEvent, dayIndex: number) => {
    if (!onCreateCard) return;
    handlePointerDown(e, dayIndex, containerRef, START_HOUR);
  };

  // Week navigation
  const goThisWeek = () => {
    setWeekStart(getWeekStart(new Date()));
    setMobilePageIndex(0);
  };
  const goPrev = () => {
    setWeekStart((w) => addDays(w, -7));
    setMobilePageIndex(0);
  };
  const goNext = () => {
    setWeekStart((w) => addDays(w, 7));
    setMobilePageIndex(0);
  };

  const colCount = visibleIndices.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={goThisWeek}
            className="text-xs font-medium text-foreground hover:text-primary px-1"
          >
            {formatWeekRange(weekStart)}
          </button>
          <button
            type="button"
            onClick={goNext}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="size-3.5" />
          <span>
            {connectedCalendars} of {totalMembers} calendars
          </span>
        </div>
      </div>

      {/* Mobile page nav */}
      {isMobile && (
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50 shrink-0">
          <button
            type="button"
            disabled={mobilePageIndex === 0}
            onClick={() => setMobilePageIndex((p) => p - 1)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="text-xs text-muted-foreground">
            {visibleIndices
              .map((i) => formatDayHeader(weekDates[i]).short)
              .join(" – ")}
          </span>
          <button
            type="button"
            disabled={mobilePageIndex === MOBILE_PAGES.length - 1}
            onClick={() => setMobilePageIndex((p) => p + 1)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          Loading calendar...
        </div>
      )}

      {/* Calendar grid */}
      {!isLoading && (
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {/* Day headers */}
          <div
            className="grid border-b border-border sticky top-0 z-10 bg-background"
            style={{
              gridTemplateColumns: `48px repeat(${colCount}, 1fr)`,
            }}
          >
            <div />
            {visibleIndices.map((i) => {
              const date = weekDates[i];
              const header = formatDayHeader(date);
              const today = isToday(date);
              return (
                <div
                  key={i}
                  className={`px-1 py-1.5 text-center ${today ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  <div className="text-[10px] font-medium">{header.short}</div>
                  <div
                    className={`text-sm ${today ? "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto" : ""}`}
                  >
                    {header.date}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div
            ref={containerRef}
            className="relative grid touch-none"
            style={{
              gridTemplateColumns: `48px repeat(${colCount}, 1fr)`,
              height: `${TOTAL_HOURS * HOUR_HEIGHT}px`,
            }}
            onPointerMove={(e) =>
              handlePointerMove(e, containerRef, START_HOUR)
            }
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {/* Hour labels */}
            <div className="relative">
              {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                <div
                  key={i}
                  className="absolute right-2 text-[0.625rem] text-muted-foreground"
                  style={{ top: `${i * HOUR_HEIGHT - 6}px` }}
                >
                  {(START_HOUR + i).toString().padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {visibleIndices.map((dayIdx) => {
              const date = weekDates[dayIdx];
              const dateKey = date.toISOString().slice(0, 10);
              const dayFreeSlots = slotsByDate.get(dateKey) ?? [];
              const dayEvents = eventsByDate.get(dateKey) ?? [];
              const previewForDay =
                previewWindow?.day_of_week === dayIdx ? previewWindow : null;

              return (
                <div
                  key={dayIdx}
                  className="relative border-l border-border"
                  onPointerDown={(e) => onColumnPointerDown(e, dayIdx)}
                >
                  {/* Hour grid lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-border/50"
                      style={{ top: `${i * HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Free slot heatmap blocks */}
                  {dayFreeSlots
                    .filter((s) => isSameUTCDate(s.start, date))
                    .map((slot, idx) => (
                      <FreeSlotBlock
                        key={`free-${idx}`}
                        startMinutes={isoToMinutes(slot.start)}
                        endMinutes={isoToMinutes(slot.end)}
                      />
                    ))}

                  {/* Resolved event blocks */}
                  {dayEvents
                    .filter((ev) => isSameUTCDate(ev.start, date))
                    .map((ev) => (
                      <EventBlock
                        key={ev.id}
                        title={ev.title}
                        startMinutes={isoToMinutes(ev.start)}
                        endMinutes={isoToMinutes(ev.end)}
                      />
                    ))}

                  {/* Drag preview */}
                  {previewForDay && (
                    <DragPreviewBlock
                      startMinutes={previewForDay.start_minutes}
                      endMinutes={previewForDay.end_minutes}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
