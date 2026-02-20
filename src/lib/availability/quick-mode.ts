import type { AvailabilitySlots } from "@/lib/types/profile";
import type { RecurringWindow } from "@/lib/types/availability";
import {
  QUICK_MODE_SLOTS,
  DAY_MAP,
  DAY_MAP_REVERSE,
  type QuickModeSlot,
} from "@/lib/types/availability";

/**
 * Convert a 7x3 availability grid (AvailabilitySlots) into RecurringWindow[].
 * Each toggled slot (morning/afternoon/evening) becomes one window per day.
 */
export function gridToWindows(slots: AvailabilitySlots): RecurringWindow[] {
  const windows: RecurringWindow[] = [];
  for (const [dayName, daySlots] of Object.entries(slots)) {
    const dayNum = DAY_MAP[dayName];
    if (dayNum == null) continue;
    for (const slotName of daySlots) {
      const range = QUICK_MODE_SLOTS[slotName as QuickModeSlot];
      if (!range) continue;
      windows.push({
        window_type: "recurring",
        day_of_week: dayNum,
        start_minutes: range.start,
        end_minutes: range.end,
      });
    }
  }
  return windows;
}

/**
 * Convert RecurringWindow[] back to a 7x3 availability grid.
 * A window maps to a slot if it covers the slot's range (within the same range boundaries).
 */
export function windowsToGrid(windows: RecurringWindow[]): AvailabilitySlots {
  const grid: AvailabilitySlots = {};
  for (const w of windows) {
    if (w.window_type !== "recurring") continue;
    const dayName = DAY_MAP_REVERSE[w.day_of_week];
    if (!dayName) continue;

    for (const [slotName, range] of Object.entries(QUICK_MODE_SLOTS)) {
      // Window covers this slot if it starts at or before the slot start
      // and ends at or after the slot end
      if (w.start_minutes <= range.start && w.end_minutes >= range.end) {
        if (!grid[dayName]) grid[dayName] = [];
        if (!grid[dayName].includes(slotName)) {
          grid[dayName].push(slotName);
        }
      }
    }
  }
  return grid;
}

export type GridCellState = "none" | "partial" | "full";

/**
 * Determine 3-state grid: for each day+slot, whether windows fully cover,
 * partially overlap, or don't overlap the slot range.
 */
export function windowsToGridWithPartial(
  windows: RecurringWindow[],
): Record<string, Record<string, GridCellState>> {
  const result: Record<string, Record<string, GridCellState>> = {};

  for (const w of windows) {
    if (w.window_type !== "recurring") continue;
    const dayName = DAY_MAP_REVERSE[w.day_of_week];
    if (!dayName) continue;

    for (const [slotName, range] of Object.entries(QUICK_MODE_SLOTS)) {
      // Check overlap: window overlaps slot if start < slot.end && end > slot.start
      const overlaps =
        w.start_minutes < range.end && w.end_minutes > range.start;
      if (!overlaps) continue;

      // Check full coverage
      const fullyCovered =
        w.start_minutes <= range.start && w.end_minutes >= range.end;

      if (!result[dayName]) result[dayName] = {};
      const current = result[dayName][slotName];

      if (fullyCovered) {
        result[dayName][slotName] = "full";
      } else if (current !== "full") {
        result[dayName][slotName] = "partial";
      }
    }
  }

  return result;
}

/**
 * Toggle a grid slot and return updated RecurringWindow[].
 * Adds or removes the window corresponding to the given day + slot.
 */
export function toggleGridSlot(
  windows: RecurringWindow[],
  day: string,
  slot: string,
): RecurringWindow[] {
  const dayNum = DAY_MAP[day];
  const range = QUICK_MODE_SLOTS[slot as QuickModeSlot];
  if (dayNum == null || !range) return windows;

  // Check if this exact window already exists
  const existingIdx = windows.findIndex(
    (w) =>
      w.day_of_week === dayNum &&
      w.start_minutes === range.start &&
      w.end_minutes === range.end,
  );

  if (existingIdx >= 0) {
    // Remove it (toggle off)
    return windows.filter((_, i) => i !== existingIdx);
  }

  // Add it (toggle on)
  return [
    ...windows,
    {
      window_type: "recurring" as const,
      day_of_week: dayNum,
      start_minutes: range.start,
      end_minutes: range.end,
    },
  ];
}
