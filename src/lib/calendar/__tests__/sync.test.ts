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
        end: new Date("2026-02-16T10:00:00Z"), // 11:00 in Berlin
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
        end: new Date("2026-02-17T01:00:00Z"), // Tue 01:00
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

  // ---------------------------------------------------------------------------
  // DST boundary tests (Europe/Berlin: CET ↔ CEST)
  // ---------------------------------------------------------------------------

  it("DST spring-forward: weekly event spans CET→CEST transition (March 29 2026)", () => {
    // Europe/Berlin springs forward on 2026-03-29: clocks jump 02:00→03:00
    // A weekly Monday 08:00 Berlin event:
    //   - Mon 2026-03-23 08:00 Berlin = 07:00 UTC (CET, UTC+1)
    //   - Mon 2026-03-30 08:00 Berlin = 06:00 UTC (CEST, UTC+2)
    // Both should map to the same canonical slot: Monday 08:00-09:00 Berlin = minute 480-540
    const blocks: BusyBlock[] = [
      {
        start: new Date("2026-03-23T07:00:00Z"), // Mon 08:00 Berlin (CET)
        end: new Date("2026-03-23T08:00:00Z"), // Mon 09:00 Berlin (CET)
      },
      {
        start: new Date("2026-03-30T06:00:00Z"), // Mon 08:00 Berlin (CEST)
        end: new Date("2026-03-30T07:00:00Z"), // Mon 09:00 Berlin (CEST)
      },
    ];

    const result = projectToCanonicalWeek(blocks, "Europe/Berlin");
    expect(result.length).toBeGreaterThan(0);
    // Monday = day 0, 08:00 = minute 480, 09:00 = minute 540
    expect(result).toContain("[480,540)");
  });

  it("DST fall-back: weekly event spans CEST→CET transition (October 25 2026)", () => {
    // Europe/Berlin falls back on 2026-10-25: clocks go 03:00→02:00
    // A weekly Monday 10:00 Berlin event:
    //   - Mon 2026-10-19 10:00 Berlin = 08:00 UTC (CEST, UTC+2)
    //   - Mon 2026-10-26 10:00 Berlin = 09:00 UTC (CET, UTC+1)
    // Both should map to Monday 10:00-11:00 Berlin = minute 600-660
    const blocks: BusyBlock[] = [
      {
        start: new Date("2026-10-19T08:00:00Z"), // Mon 10:00 Berlin (CEST)
        end: new Date("2026-10-19T09:00:00Z"), // Mon 11:00 Berlin (CEST)
      },
      {
        start: new Date("2026-10-26T09:00:00Z"), // Mon 10:00 Berlin (CET)
        end: new Date("2026-10-26T10:00:00Z"), // Mon 11:00 Berlin (CET)
      },
    ];

    const result = projectToCanonicalWeek(blocks, "Europe/Berlin");
    expect(result.length).toBeGreaterThan(0);
    // Monday = day 0, 10:00 = minute 600, 11:00 = minute 660
    expect(result).toContain("[600,660)");
  });

  it("DST lost hour: block during non-existent 02:00-03:00 Berlin on spring-forward", () => {
    // On 2026-03-29 (Sunday), 02:00-03:00 Berlin does not exist (clocks jump 02:00→03:00)
    // A block scheduled at 01:00 UTC would be 02:00 Berlin CET, but after the transition
    // this hour is skipped. Test that the function handles this gracefully.
    //
    // We schedule a recurring Sunday 02:30 Berlin event across 2 weeks:
    //   - Sun 2026-03-22 02:30 Berlin = 01:30 UTC (CET, normal)
    //   - Sun 2026-03-29 02:30 Berlin DOES NOT EXIST (lost hour)
    //     The UTC equivalent 01:30 UTC → toLocaleString → would resolve to 03:30 CEST
    //
    // The function should not crash and should produce valid output.
    // Week 1 maps to Sunday 02:30 Berlin (day 6, minute 150).
    // Week 2 at 01:30 UTC resolves to 03:30 CEST Berlin (day 6, minute 210).
    // Since the local times differ, they map to different slots and neither
    // reaches the 2-week threshold alone → result should be empty.
    const blocks: BusyBlock[] = [
      {
        start: new Date("2026-03-22T01:30:00Z"), // Sun 02:30 Berlin (CET)
        end: new Date("2026-03-22T02:30:00Z"), // Sun 03:30 Berlin (CET)
      },
      {
        start: new Date("2026-03-29T01:30:00Z"), // Sun — lost hour, resolves to 03:30 CEST
        end: new Date("2026-03-29T02:30:00Z"), // Sun — resolves to 04:30 CEST
      },
    ];

    // Should not throw
    const result = projectToCanonicalWeek(blocks, "Europe/Berlin");

    // The two weeks resolve to different local times, so no slot meets the
    // 2-week recurrence threshold — expect empty or at least valid output
    expect(Array.isArray(result)).toBe(true);
    // Each range string should be well-formed if any are returned
    for (const range of result) {
      expect(range).toMatch(/^\[\d+,\d+\)$/);
    }
  });
});
