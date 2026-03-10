"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RecurringWindow } from "@/lib/types/availability";
import { DAY_MAP_REVERSE } from "@/lib/types/availability";
import { DAY_LABELS } from "@/lib/types/profile";
import { labels } from "@/lib/labels";
import { CalendarWeekViewBlock } from "./calendar-week-view-block";
import { CalendarWeekViewBusyBlock } from "./calendar-week-view-busy-block";
import { useCalendarDrag } from "./use-calendar-drag";

const HOUR_HEIGHT = 48; // px per hour
const START_HOUR = 0; // 00:00
const END_HOUR = 24; // midnight
const TOTAL_HOURS = END_HOUR - START_HOUR;
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // Mon-Sun

/** Day-group pages for mobile: Mon-Wed, Thu-Sat, Sun */
const MOBILE_PAGES = [
  [0, 1, 2], // Mon, Tue, Wed
  [3, 4, 5], // Thu, Fri, Sat
  [6], // Sun
] as const;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    queueMicrotask(() => setIsMobile(mql.matches));
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

type CalendarWeekViewProps = {
  windows: RecurringWindow[];
  onChange: (windows: RecurringWindow[]) => void;
  readOnly?: boolean;
  busyBlocks?: RecurringWindow[];
  onTimeSelect?: (
    day: number,
    startMinutes: number,
    endMinutes: number,
  ) => void;
  timeSelection?: RecurringWindow | null;
};

export function CalendarWeekView({
  windows,
  onChange,
  readOnly,
  busyBlocks,
  onTimeSelect,
  timeSelection,
}: CalendarWeekViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [pageIndex, setPageIndex] = useState(0);

  const selectOnChange = useCallback(
    (newWindows: RecurringWindow[]) => {
      if (onTimeSelect && newWindows.length > windows.length) {
        const w = newWindows[newWindows.length - 1];
        onTimeSelect(w.day_of_week, w.start_minutes, w.end_minutes);
        return;
      }
      onChange(newWindows);
    },
    [windows.length, onTimeSelect, onChange],
  );

  const effectiveOnChange = onTimeSelect ? selectOnChange : onChange;

  const {
    handlePointerDown,
    handleBlockPointerDown,
    handlePointerMove,
    handlePointerUp,
    previewWindow,
  } = useCalendarDrag(windows, effectiveOnChange);

  const handleDelete = (index: number) => {
    onChange(windows.filter((_, i) => i !== index));
  };

  const onColumnPointerDown = (e: React.PointerEvent, day: number) => {
    if (readOnly && !onTimeSelect) return;
    handlePointerDown(e, day, containerRef, START_HOUR);
  };

  const onBlockResizeTop = (
    e: React.PointerEvent,
    index: number,
    w: RecurringWindow,
  ) => {
    handleBlockPointerDown(e, "resize-top", index, w, containerRef, START_HOUR);
  };

  const onBlockResizeBottom = (
    e: React.PointerEvent,
    index: number,
    w: RecurringWindow,
  ) => {
    handleBlockPointerDown(
      e,
      "resize-bottom",
      index,
      w,
      containerRef,
      START_HOUR,
    );
  };

  const onBlockMove = (
    e: React.PointerEvent,
    index: number,
    w: RecurringWindow,
  ) => {
    handleBlockPointerDown(e, "move", index, w, containerRef, START_HOUR);
  };

  const visibleDays = isMobile ? [...MOBILE_PAGES[pageIndex]] : ALL_DAYS;

  const colCount = visibleDays.length;
  const canPrev = pageIndex > 0;
  const canNext = pageIndex < MOBILE_PAGES.length - 1;

  return (
    <div className="select-none">
      {/* Mobile day navigation */}
      {isMobile && (
        <div className="flex items-center justify-between px-1 pb-2">
          <button
            type="button"
            aria-label={labels.a11y.previousDays}
            disabled={!canPrev}
            onClick={() => setPageIndex((p) => p - 1)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs font-medium text-muted-foreground">
            {visibleDays
              .map((d) => DAY_LABELS[DAY_MAP_REVERSE[d]] ?? DAY_MAP_REVERSE[d])
              .join(" \u2013 ")}
          </span>
          <button
            type="button"
            aria-label={labels.a11y.nextDays}
            disabled={!canNext}
            onClick={() => setPageIndex((p) => p + 1)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      <div
        className="overflow-y-auto sm:overflow-x-auto"
        style={isMobile ? { maxHeight: "60vh" } : undefined}
      >
        <div className={isMobile ? "" : "min-w-[600px]"}>
          {/* Day headers */}
          <div
            className="grid border-b border-border sticky top-0 z-10 bg-background"
            style={{
              gridTemplateColumns: `48px repeat(${colCount}, 1fr)`,
            }}
          >
            <div />
            {visibleDays.map((day) => {
              const dayName = DAY_MAP_REVERSE[day];
              return (
                <div
                  key={day}
                  className="px-1 py-2 text-center text-xs font-medium text-muted-foreground"
                >
                  {DAY_LABELS[dayName] ?? dayName}
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
                  style={{
                    top: `${i * HOUR_HEIGHT - 6}px`,
                  }}
                >
                  {(START_HOUR + i).toString().padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {visibleDays.map((day) => {
              const dayWindows = windows
                .map((w, i) => ({ w, i }))
                .filter(({ w }) => w.day_of_week === day);

              const previewForDay =
                previewWindow?.day_of_week === day ? previewWindow : null;

              return (
                <div
                  key={day}
                  className="relative border-l border-border"
                  onPointerDown={(e) => onColumnPointerDown(e, day)}
                >
                  {/* Hour grid lines */}
                  {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-border/50"
                      style={{ top: `${i * HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Window blocks */}
                  {dayWindows.map(({ w, i }) => (
                    <CalendarWeekViewBlock
                      key={w.id ?? `${w.day_of_week}-${w.start_minutes}-${i}`}
                      window={w}
                      index={i}
                      startHour={START_HOUR}
                      readOnly={readOnly}
                      onDelete={handleDelete}
                      onResizeTopStart={onBlockResizeTop}
                      onResizeBottomStart={onBlockResizeBottom}
                      onMoveStart={onBlockMove}
                    />
                  ))}

                  {/* Calendar busy blocks (read-only, blue) */}
                  {busyBlocks
                    ?.filter((b) => b.day_of_week === day)
                    .map((b, idx) => (
                      <CalendarWeekViewBusyBlock
                        key={`busy-${b.day_of_week}-${b.start_minutes}-${idx}`}
                        window={b}
                        startHour={START_HOUR}
                      />
                    ))}

                  {/* Persisted time selection block (blue) */}
                  {timeSelection?.day_of_week === day && (
                    <CalendarWeekViewBlock
                      window={timeSelection}
                      index={-1}
                      startHour={START_HOUR}
                      readOnly
                      variant="selection"
                    />
                  )}

                  {/* Preview block during drag-to-create */}
                  {previewForDay && (
                    <CalendarWeekViewBlock
                      window={previewForDay}
                      index={-1}
                      startHour={START_HOUR}
                      isPreview
                      variant={onTimeSelect ? "selection" : "default"}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
