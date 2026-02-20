// ---------------------------------------------------------------------------
// Availability types and constants
// ---------------------------------------------------------------------------

export type WindowType = "recurring" | "specific";

export type AvailabilityMode = "flexible" | "recurring" | "specific_dates";

/** A recurring weekly availability window with minute-level precision */
export type RecurringWindow = {
  id?: string;
  window_type: "recurring";
  day_of_week: number; // 0=Mon..6=Sun
  start_minutes: number; // 0-1439
  end_minutes: number; // 1-1440
};

/** A one-off availability window for a specific date */
export type SpecificWindow = {
  id?: string;
  window_type: "specific";
  specific_date: string; // ISO date string
  start_time_utc: string; // ISO datetime
  end_time_utc: string; // ISO datetime
};

export type AvailabilityWindow = RecurringWindow | SpecificWindow;

// ---------------------------------------------------------------------------
// Quick-mode slot mappings (morning/afternoon/evening → minute ranges)
// ---------------------------------------------------------------------------

export const QUICK_MODE_SLOTS = {
  night: { start: 0, end: 360 }, // 00:00-06:00
  morning: { start: 360, end: 720 }, // 06:00-12:00
  afternoon: { start: 720, end: 1080 }, // 12:00-18:00
  evening: { start: 1080, end: 1440 }, // 18:00-24:00
} as const;

export type QuickModeSlot = keyof typeof QUICK_MODE_SLOTS;

// ---------------------------------------------------------------------------
// Day mappings
// ---------------------------------------------------------------------------

/** Map day name → number (0=Mon..6=Sun) */
export const DAY_MAP: Record<string, number> = {
  mon: 0,
  tue: 1,
  wed: 2,
  thu: 3,
  fri: 4,
  sat: 5,
  sun: 6,
};

/** Map day number → name */
export const DAY_MAP_REVERSE: Record<number, string> = {
  0: "mon",
  1: "tue",
  2: "wed",
  3: "thu",
  4: "fri",
  5: "sat",
  6: "sun",
};

// ---------------------------------------------------------------------------
// Database row shape (what Supabase returns)
// ---------------------------------------------------------------------------

export type AvailabilityWindowRow = {
  id: string;
  profile_id: string | null;
  posting_id: string | null;
  window_type: WindowType;
  day_of_week: number | null;
  start_minutes: number | null;
  end_minutes: number | null;
  specific_date: string | null;
  start_time_utc: string | null;
  end_time_utc: string | null;
  canonical_range: string | null;
  created_at: string;
};

/** Parse a DB row into a typed window */
export function parseWindowRow(
  row: AvailabilityWindowRow,
): AvailabilityWindow | null {
  if (
    row.window_type === "recurring" &&
    row.day_of_week != null &&
    row.start_minutes != null &&
    row.end_minutes != null
  ) {
    return {
      id: row.id,
      window_type: "recurring",
      day_of_week: row.day_of_week,
      start_minutes: row.start_minutes,
      end_minutes: row.end_minutes,
    };
  }
  if (
    row.window_type === "specific" &&
    row.specific_date != null &&
    row.start_time_utc != null &&
    row.end_time_utc != null
  ) {
    return {
      id: row.id,
      window_type: "specific",
      specific_date: row.specific_date,
      start_time_utc: row.start_time_utc,
      end_time_utc: row.end_time_utc,
    };
  }
  return null;
}
