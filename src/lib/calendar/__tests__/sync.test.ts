import { describe, it, expect, vi } from "vitest";
import { projectToCanonicalWeek } from "../sync";
import type { BusyBlock } from "../types";

// Mock the constants module
vi.mock("@/lib/constants", () => ({
  CALENDAR_SYNC: {
    FREEBUSY_HORIZON_WEEKS: 8,
    CANONICAL_MIN_WEEKS_BUSY: 2,
    GOOGLE_POLL_INTERVAL_MINUTES: 15,
    ICAL_POLL_INTERVAL_MINUTES: 30,
  },
}));

describe("calendar/sync – projectToCanonicalWeek", () => {
  it("returns empty array for no blocks", () => {
    const result = projectToCanonicalWeek([], "UTC");
    expect(result).toEqual([]);
  });

  it("projects a single block on Monday 9-10am UTC (appears in 1 week → below threshold)", () => {
    // Only 1 week → needs CANONICAL_MIN_WEEKS_BUSY=2 to be included
    const blocks: BusyBlock[] = [
      {
        start: new Date("2026-02-16T09:00:00Z"), // Monday
        end: new Date("2026-02-16T10:00:00Z"),
      },
    ];

    const result = projectToCanonicalWeek(blocks, "UTC");
    // Single week only → below 2-week threshold → no canonical ranges
    expect(result).toEqual([]);
  });

  it("projects recurring blocks across 2+ weeks → included in canonical ranges", () => {
    // Monday 9-10am in two different weeks
    const blocks: BusyBlock[] = [
      {
        start: new Date("2026-02-16T09:00:00Z"), // Monday week 1
        end: new Date("2026-02-16T10:00:00Z"),
      },
      {
        start: new Date("2026-02-23T09:00:00Z"), // Monday week 2
        end: new Date("2026-02-23T10:00:00Z"),
      },
    ];

    const result = projectToCanonicalWeek(blocks, "UTC");
    expect(result.length).toBeGreaterThan(0);

    // Monday = day 0, 9:00 = minute 540, 10:00 = minute 600
    // Canonical ranges should be within [540, 600) range on day 0
    // With 15-min slots: [540,555), [555,570), [570,585), [585,600)
    // Merged: [540,600)
    expect(result).toContain("[540,600)");
  });

  it("projects blocks in timezone Europe/Berlin", () => {
    // Monday 10-11am Berlin = Monday 9-10am UTC (in winter, CET = UTC+1)
    // But toLocaleString converts UTC → Berlin, so 9:00 UTC → 10:00 Berlin
    // Day of week in Berlin time: Monday
    const blocks: BusyBlock[] = [
      {
        start: new Date("2026-02-16T09:00:00Z"), // 10:00 in Berlin
        end: new Date("2026-02-16T10:00:00Z"),   // 11:00 in Berlin
      },
      {
        start: new Date("2026-02-23T09:00:00Z"),
        end: new Date("2026-02-23T10:00:00Z"),
      },
    ];

    const result = projectToCanonicalWeek(blocks, "Europe/Berlin");
    expect(result.length).toBeGreaterThan(0);

    // 10:00 Berlin = minute 600, 11:00 = minute 660
    // Monday = day 0
    expect(result).toContain("[600,660)");
  });

  it("handles multi-day blocks", () => {
    // Block spanning Monday 23:00 to Tuesday 01:00 (2 hours crossing midnight)
    // Across 2 weeks
    const blocks: BusyBlock[] = [
      {
        start: new Date("2026-02-16T23:00:00Z"), // Mon 23:00
        end: new Date("2026-02-17T01:00:00Z"),   // Tue 01:00
      },
      {
        start: new Date("2026-02-23T23:00:00Z"),
        end: new Date("2026-02-24T01:00:00Z"),
      },
    ];

    const result = projectToCanonicalWeek(blocks, "UTC");
    expect(result.length).toBeGreaterThan(0);

    // Should have ranges on both Monday (day 0) and Tuesday (day 1)
    // Monday 23:00-24:00 = [1380, 1440) on day 0
    // Tuesday 00:00-01:00 = [1440, 1500) on day 1
    const hasMonday = result.some((r) => {
      const match = r.match(/\[(\d+),/);
      if (!match) return false;
      const start = parseInt(match[1]);
      return start >= 0 * 1440 && start < 1 * 1440;
    });
    const hasTuesday = result.some((r) => {
      const match = r.match(/\[(\d+),/);
      if (!match) return false;
      const start = parseInt(match[1]);
      return start >= 1 * 1440 && start < 2 * 1440;
    });
    expect(hasMonday).toBe(true);
    expect(hasTuesday).toBe(true);
  });

  it("merges adjacent 15-min slots into larger ranges", () => {
    // Monday 9:00-9:30 across 2 weeks
    const blocks: BusyBlock[] = [
      {
        start: new Date("2026-02-16T09:00:00Z"),
        end: new Date("2026-02-16T09:30:00Z"),
      },
      {
        start: new Date("2026-02-23T09:00:00Z"),
        end: new Date("2026-02-23T09:30:00Z"),
      },
    ];

    const result = projectToCanonicalWeek(blocks, "UTC");
    // Should produce [540,570) (merged from [540,555) and [555,570))
    expect(result).toContain("[540,570)");
    // Should NOT have separate [540,555) and [555,570)
    expect(result).toHaveLength(1);
  });
});
