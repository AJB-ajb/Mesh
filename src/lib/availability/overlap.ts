/**
 * Pure intersection logic for availability slots.
 *
 * Extracted from the suggest route so it can be unit tested independently.
 * Each member's availability is a map of day → period[] (e.g. { mon: ["morning", "afternoon"] }).
 * The intersection keeps only (day, period) pairs present in ALL members who have availability data.
 * Members with no availability_slots are excluded from the intersection (not blocking).
 */

export type AvailabilitySlotsMap = Record<string, string[]>;

export interface IntersectedWindow {
  day_of_week: number;
  start_minutes: number;
  end_minutes: number;
}

const DAY_MAP: Record<string, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

const SLOT_MAP: Record<string, { start: number; end: number }> = {
  night: { start: 0, end: 360 },
  morning: { start: 360, end: 720 },
  afternoon: { start: 720, end: 1080 },
  evening: { start: 1080, end: 1440 },
};

/**
 * Compute the intersection of multiple members' availability grids.
 *
 * @param memberSlots - Array of per-member availability maps. Null/undefined entries
 *   are treated as "fully available" (they don't constrain the intersection).
 * @returns Windows that ALL members with availability data share.
 *   Returns empty array when no profiles have availability data,
 *   or when there is no overlap.
 */
// ---------------------------------------------------------------------------
// Busy-block subtraction
// ---------------------------------------------------------------------------

export interface BusyPeriod {
  start: Date;
  end: Date;
}

export interface ConcreteSlot {
  start: string; // ISO 8601
  end: string;
}

const MIN_SLOT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Subtract calendar busy blocks from concrete availability slots.
 *
 * For each slot, every member's busy periods are checked.  A busy period can:
 *   - fully cover the slot → remove it
 *   - overlap the start → trim the slot's start forward
 *   - overlap the end   → trim the slot's end backward
 *   - fall in the middle → split into two sub-slots
 *
 * After all busy periods are applied, any remaining fragment shorter than
 * 15 minutes is discarded.
 */
export function subtractBusyBlocks(
  slots: ConcreteSlot[],
  busyByMember: Map<string, BusyPeriod[]>,
): ConcreteSlot[] {
  // Collect all busy periods across all members into a single sorted list.
  const allBusy: BusyPeriod[] = [];
  for (const periods of busyByMember.values()) {
    allBusy.push(...periods);
  }

  // Sort by start time so we can process in order
  allBusy.sort((a, b) => a.start.getTime() - b.start.getTime());

  if (allBusy.length === 0) return slots;

  let remaining: Array<{ start: Date; end: Date }> = slots.map((s) => ({
    start: new Date(s.start),
    end: new Date(s.end),
  }));

  // Apply each busy period against all current fragments
  for (const busy of allBusy) {
    const next: Array<{ start: Date; end: Date }> = [];
    for (const slot of remaining) {
      // No overlap — busy is entirely before or after the slot
      if (busy.end <= slot.start || busy.start >= slot.end) {
        next.push(slot);
        continue;
      }

      // Busy fully covers the slot
      if (busy.start <= slot.start && busy.end >= slot.end) {
        // slot removed
        continue;
      }

      // Busy covers the start of the slot
      if (busy.start <= slot.start && busy.end < slot.end) {
        next.push({ start: busy.end, end: slot.end });
        continue;
      }

      // Busy covers the end of the slot
      if (busy.start > slot.start && busy.end >= slot.end) {
        next.push({ start: slot.start, end: busy.start });
        continue;
      }

      // Busy is in the middle — split into two pieces
      next.push({ start: slot.start, end: busy.start });
      next.push({ start: busy.end, end: slot.end });
    }
    remaining = next;
  }

  // Filter out fragments shorter than 15 minutes and convert back
  return remaining
    .filter((s) => s.end.getTime() - s.start.getTime() >= MIN_SLOT_MS)
    .map((s) => ({
      start: s.start.toISOString(),
      end: s.end.toISOString(),
    }));
}

// ---------------------------------------------------------------------------
// Recurring-window intersection (minute-level precision)
// ---------------------------------------------------------------------------

type Interval = { start: number; end: number };

/** Merge overlapping/adjacent intervals into a sorted, non-overlapping list. */
function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Interval[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const last = merged[merged.length - 1];
    if (sorted[i].start <= last.end) {
      last.end = Math.max(last.end, sorted[i].end);
    } else {
      merged.push({ ...sorted[i] });
    }
  }
  return merged;
}

/** Intersect two sorted, non-overlapping interval lists. */
function intersectIntervalLists(a: Interval[], b: Interval[]): Interval[] {
  const result: Interval[] = [];
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    const start = Math.max(a[i].start, b[j].start);
    const end = Math.min(a[i].end, b[j].end);
    if (start < end) result.push({ start, end });
    if (a[i].end < b[j].end) i++;
    else j++;
  }
  return result;
}

export interface RecurringWindowInput {
  day_of_week: number;
  start_minutes: number;
  end_minutes: number;
}

/**
 * Intersect multiple members' RecurringWindow arrays with minute-level precision.
 *
 * Members with null/undefined/empty windows are excluded (not blocking).
 * Returns IntersectedWindow[] — the time ranges where ALL data-bearing members overlap.
 */
export function intersectRecurringWindows(
  memberWindows: (RecurringWindowInput[] | null | undefined)[],
): IntersectedWindow[] {
  const withData = memberWindows.filter(
    (ws): ws is RecurringWindowInput[] => ws != null && ws.length > 0,
  );
  if (withData.length === 0) return [];

  // Build per-member intervals grouped by day
  const perMemberByDay: Map<number, Interval[]>[] = withData.map((ws) => {
    const byDay = new Map<number, Interval[]>();
    for (const w of ws) {
      let list = byDay.get(w.day_of_week);
      if (!list) {
        list = [];
        byDay.set(w.day_of_week, list);
      }
      list.push({ start: w.start_minutes, end: w.end_minutes });
    }
    // Merge each day's intervals
    for (const [day, intervals] of byDay) {
      byDay.set(day, mergeIntervals(intervals));
    }
    return byDay;
  });

  const result: IntersectedWindow[] = [];

  // For each day 0-6, intersect across all members
  for (let day = 0; day < 7; day++) {
    let current: Interval[] | null = null;
    for (const memberByDay of perMemberByDay) {
      const dayIntervals = memberByDay.get(day);
      if (!dayIntervals || dayIntervals.length === 0) {
        // This member has no availability on this day → intersection is empty
        current = [];
        break;
      }
      if (current === null) {
        current = dayIntervals;
      } else {
        current = intersectIntervalLists(current, dayIntervals);
        if (current.length === 0) break;
      }
    }
    if (current) {
      for (const iv of current) {
        result.push({
          day_of_week: day,
          start_minutes: iv.start,
          end_minutes: iv.end,
        });
      }
    }
  }

  return result;
}

/**
 * Convert legacy AvailabilitySlotsMap to RecurringWindowInput[].
 * Used as a fallback for members who haven't migrated to availability_windows.
 */
export function legacySlotsToWindows(
  slots: AvailabilitySlotsMap,
): RecurringWindowInput[] {
  const windows: RecurringWindowInput[] = [];
  for (const [day, periods] of Object.entries(slots)) {
    const dow = DAY_MAP[day];
    if (dow === undefined) continue;
    for (const period of periods) {
      const range = SLOT_MAP[period];
      if (range) {
        windows.push({
          day_of_week: dow,
          start_minutes: range.start,
          end_minutes: range.end,
        });
      }
    }
  }
  return windows;
}

// ---------------------------------------------------------------------------
// Legacy weekly availability intersection (coarse slots)
// ---------------------------------------------------------------------------

export function intersectAvailability(
  memberSlots: (AvailabilitySlotsMap | null | undefined)[],
): IntersectedWindow[] {
  // Filter to members who actually have availability data
  const withData = memberSlots.filter(
    (s): s is AvailabilitySlotsMap => s != null && Object.keys(s).length > 0,
  );

  if (withData.length === 0) return [];

  // Build per-member key sets: "dow:start:end"
  const perMemberKeys: Set<string>[] = withData.map((slots) => {
    const keys = new Set<string>();
    for (const [day, periods] of Object.entries(slots)) {
      const dow = DAY_MAP[day];
      if (dow === undefined) continue;
      for (const period of periods) {
        const range = SLOT_MAP[period];
        if (range) keys.add(`${dow}:${range.start}:${range.end}`);
      }
    }
    return keys;
  });

  // Intersect: keep only keys present in ALL member sets
  const result: IntersectedWindow[] = [];
  const firstSet = perMemberKeys[0];
  for (const key of firstSet) {
    if (perMemberKeys.every((s) => s.has(key))) {
      const [dow, start, end] = key.split(":").map(Number);
      result.push({
        day_of_week: dow,
        start_minutes: start,
        end_minutes: end,
      });
    }
  }

  return result;
}
