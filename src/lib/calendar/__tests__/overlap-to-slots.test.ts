import { describe, it, expect } from "vitest";
import {
  windowsToConcreteDates,
  formatSlotsForPrompt,
} from "../overlap-to-slots";
import type { CommonAvailabilityWindow } from "@/lib/types/scheduling";

describe("windowsToConcreteDates", () => {
  // Use a fixed date: Monday March 10, 2025 at 08:00 UTC
  const monday = new Date("2025-03-10T08:00:00Z");

  it("converts a Monday window to the correct date", () => {
    const windows: CommonAvailabilityWindow[] = [
      { day_of_week: 0, start_minutes: 600, end_minutes: 720 }, // Mon 10:00-12:00
    ];

    const slots = windowsToConcreteDates(windows, monday, 7);

    // Should find the Monday slot (today if after 08:00 start)
    expect(slots.length).toBe(1);
    expect(slots[0].day_of_week).toBe(0);
    expect(slots[0].start_minutes).toBe(600);
    expect(slots[0].end_minutes).toBe(720);
  });

  it("skips slots in the past", () => {
    // fromDate is 10:30 — a 10:00 window should be skipped
    const lateMonday = new Date("2025-03-10T10:30:00Z");
    const windows: CommonAvailabilityWindow[] = [
      { day_of_week: 0, start_minutes: 600, end_minutes: 720 }, // Mon 10:00-12:00 (past)
      { day_of_week: 0, start_minutes: 720, end_minutes: 840 }, // Mon 12:00-14:00 (future)
    ];

    const slots = windowsToConcreteDates(windows, lateMonday, 7);

    // Only the 12:00-14:00 slot should survive
    expect(slots.length).toBe(1);
    expect(slots[0].start_minutes).toBe(720);
  });

  it("generates slots for multiple weeks", () => {
    const windows: CommonAvailabilityWindow[] = [
      { day_of_week: 2, start_minutes: 1080, end_minutes: 1200 }, // Wed 18:00-20:00
    ];

    const slots = windowsToConcreteDates(windows, monday, 14);

    // Should get 2 Wednesdays in 14 days
    expect(slots.length).toBe(2);
  });

  it("maps day_of_week correctly (0=Mon through 6=Sun)", () => {
    // Create windows for all 7 days
    const windows: CommonAvailabilityWindow[] = Array.from(
      { length: 7 },
      (_, i) => ({
        day_of_week: i,
        start_minutes: 720, // noon
        end_minutes: 780, // 1pm
      }),
    );

    const earlyMonday = new Date("2025-03-10T00:00:00Z");
    const slots = windowsToConcreteDates(windows, earlyMonday, 7);

    // Should get exactly 7 slots (one per day)
    expect(slots.length).toBe(7);

    // Verify day mapping
    const dayOfWeekSet = new Set(slots.map((s) => s.day_of_week));
    expect(dayOfWeekSet.size).toBe(7);
  });

  it("returns empty array for empty windows", () => {
    const slots = windowsToConcreteDates([], monday, 14);
    expect(slots).toEqual([]);
  });
});

describe("formatSlotsForPrompt", () => {
  it("formats slots as human-readable strings", () => {
    const result = formatSlotsForPrompt([
      {
        start: "2025-03-12T18:00:00.000Z",
        end: "2025-03-12T20:00:00.000Z",
        day_of_week: 2,
        start_minutes: 1080,
        end_minutes: 1200,
      },
    ]);

    expect(result).toContain("Wed");
    expect(result).toContain("Mar");
  });

  it("returns placeholder for empty slots", () => {
    const result = formatSlotsForPrompt([]);
    expect(result).toBe("No mutual free windows found");
  });
});
