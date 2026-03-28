/**
 * Convert abstract weekly availability windows to concrete date-time slots.
 */

import type { CommonAvailabilityWindow } from "@/lib/types/scheduling";

export interface ConcreteSlot {
  start: string; // ISO 8601
  end: string;
  day_of_week: number;
  start_minutes: number;
  end_minutes: number;
}

/**
 * Convert recurring weekly windows (day_of_week, start_minutes, end_minutes)
 * to concrete date-time ranges for the next N days.
 *
 * day_of_week: 0=Mon..6=Sun (matches the DB function).
 * Minutes are from midnight (e.g. 1080 = 18:00).
 */
export function windowsToConcreteDates(
  windows: CommonAvailabilityWindow[],
  fromDate: Date,
  days: number = 14,
  _timezone: string = "UTC",
): ConcreteSlot[] {
  const slots: ConcreteSlot[] = [];

  // Map DB day_of_week (0=Mon..6=Sun) to JS getDay() (0=Sun..6=Sat)
  // DB 0(Mon) -> JS 1, DB 1(Tue) -> JS 2, ..., DB 6(Sun) -> JS 0
  function dbDowToJsDow(dbDow: number): number {
    return (dbDow + 1) % 7;
  }

  for (let d = 0; d < days; d++) {
    const date = new Date(fromDate);
    date.setUTCDate(date.getUTCDate() + d);

    const jsDow = date.getUTCDay();

    for (const window of windows) {
      const targetJsDow = dbDowToJsDow(window.day_of_week);
      if (jsDow !== targetJsDow) continue;

      const startHour = Math.floor(window.start_minutes / 60);
      const startMin = window.start_minutes % 60;
      const endHour = Math.floor(window.end_minutes / 60);
      const endMin = window.end_minutes % 60;

      const start = new Date(date);
      start.setUTCHours(startHour, startMin, 0, 0);

      const end = new Date(date);
      end.setUTCHours(endHour, endMin, 0, 0);

      // Skip slots in the past
      if (start <= fromDate) continue;

      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
        day_of_week: window.day_of_week,
        start_minutes: window.start_minutes,
        end_minutes: window.end_minutes,
      });
    }
  }

  return slots;
}

/**
 * Format concrete slots into a human-readable string for the LLM prompt.
 */
export function formatSlotsForPrompt(slots: ConcreteSlot[]): string {
  if (slots.length === 0) return "No mutual free windows found";

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return slots
    .map((slot) => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      const dayName = dayNames[slot.day_of_week];
      const dateStr = start.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      const startTime = start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const endTime = end.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${dayName} ${dateStr}: ${startTime} - ${endTime}`;
    })
    .join("\n");
}
