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
