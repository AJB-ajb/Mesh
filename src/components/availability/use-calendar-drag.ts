"use client";

import { useState, useCallback, useRef } from "react";
import type { RecurringWindow } from "@/lib/types/availability";

const SNAP_MINUTES = 15;
const HOUR_HEIGHT = 48; // px per hour in the calendar grid
const MINUTES_PER_PIXEL = 60 / HOUR_HEIGHT;

type DragMode = "create" | "move" | "resize-top" | "resize-bottom";

type DragState = {
  mode: DragMode;
  dayOfWeek: number;
  /** For create: the initial minute. For move/resize: the starting mouse Y. */
  startMinutes: number;
  currentMinutes: number;
  /** Index of the window being moved/resized (null for create) */
  windowIndex: number | null;
  /** Original window snapshot for move/resize */
  originalWindow: RecurringWindow | null;
};

function snapMinutes(m: number): number {
  return Math.round(m / SNAP_MINUTES) * SNAP_MINUTES;
}

function clampMinutes(m: number, min = 0, max = 1440): number {
  return Math.max(min, Math.min(max, m));
}

function minutesFromY(
  y: number,
  containerTop: number,
  startHour: number,
): number {
  const relativeY = y - containerTop;
  return startHour * 60 + relativeY * MINUTES_PER_PIXEL;
}

export type UseCalendarDragResult = {
  dragState: DragState | null;
  handleMouseDown: (
    e: React.MouseEvent,
    dayOfWeek: number,
    containerRef: React.RefObject<HTMLDivElement | null>,
    startHour: number,
  ) => void;
  handleBlockMouseDown: (
    e: React.MouseEvent,
    mode: "move" | "resize-top" | "resize-bottom",
    windowIndex: number,
    window: RecurringWindow,
    containerRef: React.RefObject<HTMLDivElement | null>,
    startHour: number,
  ) => void;
  handleMouseMove: (
    e: React.MouseEvent,
    containerRef: React.RefObject<HTMLDivElement | null>,
    startHour: number,
  ) => void;
  handleMouseUp: () => void;
  /** Preview window during drag-to-create */
  previewWindow: RecurringWindow | null;
};

export function useCalendarDrag(
  windows: RecurringWindow[],
  onChange: (w: RecurringWindow[]) => void,
): UseCalendarDragResult {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const handleMouseDown = useCallback(
    (
      e: React.MouseEvent,
      dayOfWeek: number,
      containerRef: React.RefObject<HTMLDivElement | null>,
      startHour: number,
    ) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const minutes = snapMinutes(
        clampMinutes(minutesFromY(e.clientY, rect.top, startHour)),
      );

      const state: DragState = {
        mode: "create",
        dayOfWeek,
        startMinutes: minutes,
        currentMinutes: minutes,
        windowIndex: null,
        originalWindow: null,
      };
      dragRef.current = state;
      setDragState(state);
    },
    [],
  );

  const handleBlockMouseDown = useCallback(
    (
      e: React.MouseEvent,
      mode: "move" | "resize-top" | "resize-bottom",
      windowIndex: number,
      window: RecurringWindow,
      containerRef: React.RefObject<HTMLDivElement | null>,
      startHour: number,
    ) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const minutes = minutesFromY(e.clientY, rect.top, startHour);

      const state: DragState = {
        mode,
        dayOfWeek: window.day_of_week,
        startMinutes: minutes,
        currentMinutes: minutes,
        windowIndex,
        originalWindow: { ...window },
      };
      dragRef.current = state;
      setDragState(state);
    },
    [],
  );

  const handleMouseMove = useCallback(
    (
      e: React.MouseEvent,
      containerRef: React.RefObject<HTMLDivElement | null>,
      startHour: number,
    ) => {
      const state = dragRef.current;
      if (!state) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const minutes = minutesFromY(e.clientY, rect.top, startHour);
      const snapped = snapMinutes(clampMinutes(minutes));

      const updated = { ...state, currentMinutes: snapped };
      dragRef.current = updated;
      setDragState(updated);

      // For move/resize, update the window in real-time
      if (
        state.mode !== "create" &&
        state.windowIndex != null &&
        state.originalWindow
      ) {
        const delta = snapped - snapMinutes(clampMinutes(state.startMinutes));
        const orig = state.originalWindow;
        const newWindows = [...windows];

        if (state.mode === "move") {
          const duration = orig.end_minutes - orig.start_minutes;
          let newStart = clampMinutes(
            orig.start_minutes + delta,
            0,
            1440 - duration,
          );
          newStart = snapMinutes(newStart);
          newWindows[state.windowIndex] = {
            ...orig,
            start_minutes: newStart,
            end_minutes: newStart + duration,
          };
        } else if (state.mode === "resize-top") {
          const newStart = clampMinutes(
            snapMinutes(orig.start_minutes + delta),
            0,
            orig.end_minutes - SNAP_MINUTES,
          );
          newWindows[state.windowIndex] = {
            ...orig,
            start_minutes: newStart,
          };
        } else if (state.mode === "resize-bottom") {
          const newEnd = clampMinutes(
            snapMinutes(orig.end_minutes + delta),
            orig.start_minutes + SNAP_MINUTES,
            1440,
          );
          newWindows[state.windowIndex] = {
            ...orig,
            end_minutes: newEnd,
          };
        }

        onChange(newWindows);
      }
    },
    [windows, onChange],
  );

  const handleMouseUp = useCallback(() => {
    const state = dragRef.current;
    if (!state) return;

    if (state.mode === "create") {
      const min = Math.min(state.startMinutes, state.currentMinutes);
      const max = Math.max(state.startMinutes, state.currentMinutes);
      const start = snapMinutes(clampMinutes(min));
      const end = snapMinutes(clampMinutes(max));

      // Only create if there's a meaningful duration (at least one snap unit)
      if (end - start >= SNAP_MINUTES) {
        onChange([
          ...windows,
          {
            window_type: "recurring",
            day_of_week: state.dayOfWeek,
            start_minutes: start,
            end_minutes: end,
          },
        ]);
      }
    }
    // For move/resize, the changes were applied during mouse move

    dragRef.current = null;
    setDragState(null);
  }, [windows, onChange]);

  // Compute preview window for drag-to-create
  let previewWindow: RecurringWindow | null = null;
  if (dragState?.mode === "create") {
    const min = Math.min(dragState.startMinutes, dragState.currentMinutes);
    const max = Math.max(dragState.startMinutes, dragState.currentMinutes);
    const start = snapMinutes(clampMinutes(min));
    const end = snapMinutes(clampMinutes(max));
    if (end - start >= SNAP_MINUTES) {
      previewWindow = {
        window_type: "recurring",
        day_of_week: dragState.dayOfWeek,
        start_minutes: start,
        end_minutes: end,
      };
    }
  }

  return {
    dragState,
    handleMouseDown,
    handleBlockMouseDown,
    handleMouseMove,
    handleMouseUp,
    previewWindow,
  };
}
