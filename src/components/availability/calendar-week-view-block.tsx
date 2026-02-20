"use client";

import { X } from "lucide-react";
import type { RecurringWindow } from "@/lib/types/availability";

const HOUR_HEIGHT = 48; // must match use-calendar-drag.ts

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

type CalendarWeekViewBlockProps = {
  window: RecurringWindow;
  index: number;
  startHour: number;
  readOnly?: boolean;
  isPreview?: boolean;
  variant?: "default" | "selection";
  onDelete?: (index: number) => void;
  onResizeTopStart?: (
    e: React.MouseEvent,
    index: number,
    window: RecurringWindow,
  ) => void;
  onResizeBottomStart?: (
    e: React.MouseEvent,
    index: number,
    window: RecurringWindow,
  ) => void;
  onMoveStart?: (
    e: React.MouseEvent,
    index: number,
    window: RecurringWindow,
  ) => void;
};

export function CalendarWeekViewBlock({
  window: w,
  index,
  startHour,
  readOnly,
  isPreview,
  variant = "default",
  onDelete,
  onResizeTopStart,
  onResizeBottomStart,
  onMoveStart,
}: CalendarWeekViewBlockProps) {
  const startOffset = w.start_minutes - startHour * 60;
  const duration = w.end_minutes - w.start_minutes;
  const top = (startOffset / 60) * HOUR_HEIGHT;
  const height = (duration / 60) * HOUR_HEIGHT;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (readOnly) return;
    onMoveStart?.(e, index, w);
  };

  const colorClasses =
    variant === "selection"
      ? isPreview
        ? "border-primary/40 bg-primary/5"
        : "border-primary/50 bg-primary/10 hover:bg-primary/15"
      : isPreview
        ? "border-destructive/40 bg-destructive/5"
        : "border-destructive/50 bg-destructive/10 hover:bg-destructive/15";

  const textColor =
    variant === "selection" ? "text-primary/70" : "text-destructive/70";

  return (
    <div
      className={`absolute left-0.5 right-0.5 rounded-sm border text-xs select-none ${colorClasses} ${readOnly ? "" : "cursor-grab active:cursor-grabbing"}`}
      style={{ top: `${top}px`, height: `${Math.max(height, 12)}px` }}
      onMouseDown={handleMouseDown}
    >
      {/* Resize handle: top */}
      {!readOnly && !isPreview && (
        <div
          className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize"
          onMouseDown={(e) => onResizeTopStart?.(e, index, w)}
        />
      )}

      {/* Content */}
      <div className="flex items-start justify-between px-1 pt-0.5 overflow-hidden">
        <span className={`truncate text-[10px] font-medium ${textColor}`}>
          {formatTime(w.start_minutes)}-{formatTime(w.end_minutes)}
        </span>
        {!readOnly && !isPreview && (
          <button
            type="button"
            className="ml-0.5 shrink-0 rounded-sm p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(index);
            }}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Resize handle: bottom */}
      {!readOnly && !isPreview && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize"
          onMouseDown={(e) => onResizeBottomStart?.(e, index, w)}
        />
      )}
    </div>
  );
}
