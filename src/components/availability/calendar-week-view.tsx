"use client";

import { useRef } from "react";
import type { RecurringWindow } from "@/lib/types/availability";
import { DAY_MAP_REVERSE } from "@/lib/types/availability";
import { DAY_LABELS } from "@/lib/types/profile";
import { CalendarWeekViewBlock } from "./calendar-week-view-block";
import { useCalendarDrag } from "./use-calendar-drag";

const HOUR_HEIGHT = 48; // px per hour
const START_HOUR = 6; // 06:00
const END_HOUR = 24; // midnight
const TOTAL_HOURS = END_HOUR - START_HOUR;
const DAYS = [0, 1, 2, 3, 4, 5, 6]; // Mon-Sun

type CalendarWeekViewProps = {
  windows: RecurringWindow[];
  onChange: (windows: RecurringWindow[]) => void;
  readOnly?: boolean;
};

export function CalendarWeekView({
  windows,
  onChange,
  readOnly,
}: CalendarWeekViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    handleMouseDown,
    handleBlockMouseDown,
    handleMouseMove,
    handleMouseUp,
    previewWindow,
  } = useCalendarDrag(windows, onChange);

  const handleDelete = (index: number) => {
    onChange(windows.filter((_, i) => i !== index));
  };

  const onColumnMouseDown = (e: React.MouseEvent, day: number) => {
    if (readOnly) return;
    handleMouseDown(e, day, containerRef, START_HOUR);
  };

  const onBlockResizeTop = (
    e: React.MouseEvent,
    index: number,
    w: RecurringWindow,
  ) => {
    handleBlockMouseDown(e, "resize-top", index, w, containerRef, START_HOUR);
  };

  const onBlockResizeBottom = (
    e: React.MouseEvent,
    index: number,
    w: RecurringWindow,
  ) => {
    handleBlockMouseDown(
      e,
      "resize-bottom",
      index,
      w,
      containerRef,
      START_HOUR,
    );
  };

  const onBlockMove = (
    e: React.MouseEvent,
    index: number,
    w: RecurringWindow,
  ) => {
    handleBlockMouseDown(e, "move", index, w, containerRef, START_HOUR);
  };

  return (
    <div
      className="overflow-x-auto select-none"
      onMouseMove={(e) => handleMouseMove(e, containerRef, START_HOUR)}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="min-w-[600px]">
        {/* Day headers */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-border">
          <div />
          {DAYS.map((day) => {
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
          className="relative grid grid-cols-[48px_repeat(7,1fr)]"
          style={{ height: `${TOTAL_HOURS * HOUR_HEIGHT}px` }}
        >
          {/* Hour labels */}
          <div className="relative">
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-2 text-[10px] text-muted-foreground"
                style={{
                  top: `${i * HOUR_HEIGHT - 6}px`,
                }}
              >
                {(START_HOUR + i).toString().padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {DAYS.map((day) => {
            const dayWindows = windows
              .map((w, i) => ({ w, i }))
              .filter(({ w }) => w.day_of_week === day);

            const previewForDay =
              previewWindow?.day_of_week === day ? previewWindow : null;

            return (
              <div
                key={day}
                className="relative border-l border-border"
                onMouseDown={(e) => onColumnMouseDown(e, day)}
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

                {/* Preview block during drag-to-create */}
                {previewForDay && (
                  <CalendarWeekViewBlock
                    window={previewForDay}
                    index={-1}
                    startHour={START_HOUR}
                    isPreview
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
