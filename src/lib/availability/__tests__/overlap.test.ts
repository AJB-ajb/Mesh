import { describe, it, expect } from "vitest";
import {
  intersectAvailability,
  intersectRecurringWindows,
  legacySlotsToWindows,
  subtractBusyBlocks,
  type AvailabilitySlotsMap,
  type BusyPeriod,
  type ConcreteSlot,
  type RecurringWindowInput,
} from "../overlap";

describe("intersectAvailability", () => {
  it("returns Monday morning when both members are free Monday morning", () => {
    const memberA: AvailabilitySlotsMap = { mon: ["morning"] };
    const memberB: AvailabilitySlotsMap = { mon: ["morning", "afternoon"] };

    const result = intersectAvailability([memberA, memberB]);
    expect(result).toEqual([
      { day_of_week: 0, start_minutes: 360, end_minutes: 720 },
    ]);
  });

  it("returns empty when member A is free Monday morning and member B Monday evening", () => {
    const memberA: AvailabilitySlotsMap = { mon: ["morning"] };
    const memberB: AvailabilitySlotsMap = { mon: ["evening"] };

    const result = intersectAvailability([memberA, memberB]);
    expect(result).toEqual([]);
  });

  it("returns only the common slot among 3 members", () => {
    const memberA: AvailabilitySlotsMap = {
      mon: ["morning", "afternoon"],
      wed: ["evening"],
    };
    const memberB: AvailabilitySlotsMap = {
      mon: ["morning"],
      tue: ["morning"],
      wed: ["evening"],
    };
    const memberC: AvailabilitySlotsMap = {
      mon: ["morning", "evening"],
      wed: ["morning"],
    };

    const result = intersectAvailability([memberA, memberB, memberC]);
    // Only mon:morning is in all three
    expect(result).toEqual([
      { day_of_week: 0, start_minutes: 360, end_minutes: 720 },
    ]);
  });

  it("treats member with no availability_slots (null) as fully available — not blocking", () => {
    const memberA: AvailabilitySlotsMap = {
      mon: ["morning"],
      fri: ["afternoon"],
    };

    const result = intersectAvailability([memberA, null]);
    // Null member is excluded from intersection, so memberA's slots are returned
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      day_of_week: 0,
      start_minutes: 360,
      end_minutes: 720,
    });
    expect(result).toContainEqual({
      day_of_week: 4,
      start_minutes: 720,
      end_minutes: 1080,
    });
  });

  it("treats member with undefined availability_slots as fully available", () => {
    const memberA: AvailabilitySlotsMap = { tue: ["afternoon"] };

    const result = intersectAvailability([memberA, undefined]);
    expect(result).toEqual([
      { day_of_week: 1, start_minutes: 720, end_minutes: 1080 },
    ]);
  });

  it("returns empty array when all members have null/undefined slots", () => {
    const result = intersectAvailability([null, undefined, null]);
    expect(result).toEqual([]);
  });

  it("returns empty array for empty profiles array", () => {
    const result = intersectAvailability([]);
    expect(result).toEqual([]);
  });

  it("returns all slots for a single member", () => {
    const memberA: AvailabilitySlotsMap = {
      mon: ["morning", "afternoon"],
      wed: ["evening"],
    };

    const result = intersectAvailability([memberA]);
    expect(result).toHaveLength(3);
  });

  it("handles empty object availability (member marked nothing)", () => {
    const memberA: AvailabilitySlotsMap = { mon: ["morning"] };
    const memberB: AvailabilitySlotsMap = {}; // marked nothing

    // Empty object is treated like null — filtered out
    const result = intersectAvailability([memberA, memberB]);
    expect(result).toEqual([
      { day_of_week: 0, start_minutes: 360, end_minutes: 720 },
    ]);
  });

  it("ignores unknown day names", () => {
    const memberA: AvailabilitySlotsMap = { xyz: ["morning"] };
    const result = intersectAvailability([memberA]);
    expect(result).toEqual([]);
  });

  it("ignores unknown period names", () => {
    const memberA: AvailabilitySlotsMap = { mon: ["midnight"] };
    const result = intersectAvailability([memberA]);
    expect(result).toEqual([]);
  });

  it("handles all 4 time periods correctly", () => {
    const memberA: AvailabilitySlotsMap = {
      mon: ["night", "morning", "afternoon", "evening"],
    };
    const memberB: AvailabilitySlotsMap = {
      mon: ["night", "morning", "afternoon", "evening"],
    };

    const result = intersectAvailability([memberA, memberB]);
    expect(result).toHaveLength(4);
    expect(result).toContainEqual({
      day_of_week: 0,
      start_minutes: 0,
      end_minutes: 360,
    });
    expect(result).toContainEqual({
      day_of_week: 0,
      start_minutes: 360,
      end_minutes: 720,
    });
    expect(result).toContainEqual({
      day_of_week: 0,
      start_minutes: 720,
      end_minutes: 1080,
    });
    expect(result).toContainEqual({
      day_of_week: 0,
      start_minutes: 1080,
      end_minutes: 1440,
    });
  });
});

// ---------------------------------------------------------------------------
// intersectRecurringWindows (minute-level precision)
// ---------------------------------------------------------------------------

describe("intersectRecurringWindows", () => {
  function win(day: number, start: number, end: number): RecurringWindowInput {
    return { day_of_week: day, start_minutes: start, end_minutes: end };
  }

  it("returns overlap when two members partially overlap on the same day", () => {
    const a = [win(0, 540, 720)]; // Mon 9:00-12:00
    const b = [win(0, 600, 780)]; // Mon 10:00-13:00
    const result = intersectRecurringWindows([a, b]);
    expect(result).toEqual([
      { day_of_week: 0, start_minutes: 600, end_minutes: 720 },
    ]);
  });

  it("returns empty when no overlap", () => {
    const a = [win(0, 540, 600)]; // Mon 9:00-10:00
    const b = [win(0, 720, 780)]; // Mon 12:00-13:00
    expect(intersectRecurringWindows([a, b])).toEqual([]);
  });

  it("treats null/empty member as non-blocking", () => {
    const a = [win(1, 540, 720)]; // Tue 9:00-12:00
    expect(intersectRecurringWindows([a, null, undefined, []])).toEqual([
      { day_of_week: 1, start_minutes: 540, end_minutes: 720 },
    ]);
  });

  it("returns empty when all members are null", () => {
    expect(intersectRecurringWindows([null, undefined])).toEqual([]);
  });

  it("handles multiple days", () => {
    const a = [win(0, 540, 720), win(2, 900, 1080)];
    const b = [win(0, 600, 780), win(2, 960, 1140)];
    expect(intersectRecurringWindows([a, b])).toEqual([
      { day_of_week: 0, start_minutes: 600, end_minutes: 720 },
      { day_of_week: 2, start_minutes: 960, end_minutes: 1080 },
    ]);
  });

  it("narrows across three members", () => {
    const a = [win(0, 480, 900)]; // Mon 8:00-15:00
    const b = [win(0, 540, 840)]; // Mon 9:00-14:00
    const c = [win(0, 600, 780)]; // Mon 10:00-13:00
    expect(intersectRecurringWindows([a, b, c])).toEqual([
      { day_of_week: 0, start_minutes: 600, end_minutes: 780 },
    ]);
  });

  it("merges overlapping windows within a single member before intersecting", () => {
    // Member A has two overlapping windows that together cover 9:00-14:00
    const a = [win(0, 540, 720), win(0, 660, 840)];
    const b = [win(0, 600, 780)]; // Mon 10:00-13:00
    expect(intersectRecurringWindows([a, b])).toEqual([
      { day_of_week: 0, start_minutes: 600, end_minutes: 780 },
    ]);
  });

  it("returns empty when one member has no data for a day the other has", () => {
    const a = [win(0, 540, 720)]; // Mon only
    const b = [win(1, 540, 720)]; // Tue only
    expect(intersectRecurringWindows([a, b])).toEqual([]);
  });

  it("returns all windows for a single member", () => {
    const a = [win(0, 540, 720), win(3, 900, 1080)];
    expect(intersectRecurringWindows([a])).toEqual([
      { day_of_week: 0, start_minutes: 540, end_minutes: 720 },
      { day_of_week: 3, start_minutes: 900, end_minutes: 1080 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// legacySlotsToWindows
// ---------------------------------------------------------------------------

describe("legacySlotsToWindows", () => {
  it("converts a slots map to RecurringWindowInput[]", () => {
    const slots: AvailabilitySlotsMap = { mon: ["morning", "afternoon"] };
    const result = legacySlotsToWindows(slots);
    expect(result).toEqual([
      { day_of_week: 0, start_minutes: 360, end_minutes: 720 },
      { day_of_week: 0, start_minutes: 720, end_minutes: 1080 },
    ]);
  });

  it("ignores unknown days and periods", () => {
    const slots: AvailabilitySlotsMap = { xyz: ["morning"], mon: ["midnight"] };
    expect(legacySlotsToWindows(slots)).toEqual([]);
  });

  it("returns empty for empty input", () => {
    expect(legacySlotsToWindows({})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// subtractBusyBlocks
// ---------------------------------------------------------------------------

describe("subtractBusyBlocks", () => {
  // Helper to create a ConcreteSlot from ISO strings
  function slot(start: string, end: string): ConcreteSlot {
    return { start, end };
  }

  // Helper to create a BusyPeriod from ISO strings
  function busy(start: string, end: string): BusyPeriod {
    return { start: new Date(start), end: new Date(end) };
  }

  it("returns slots unchanged when there are no busy blocks", () => {
    const slots = [slot("2026-03-16T09:00:00Z", "2026-03-16T12:00:00Z")];
    const busyMap = new Map<string, BusyPeriod[]>();

    const result = subtractBusyBlocks(slots, busyMap);
    expect(result).toEqual(slots);
  });

  it("removes a slot fully covered by a busy block", () => {
    const slots = [slot("2026-03-16T09:00:00Z", "2026-03-16T12:00:00Z")];
    const busyMap = new Map([
      ["user-1", [busy("2026-03-16T08:00:00Z", "2026-03-16T13:00:00Z")]],
    ]);

    const result = subtractBusyBlocks(slots, busyMap);
    expect(result).toEqual([]);
  });

  it("trims the start of a slot when a busy block covers the beginning", () => {
    const slots = [slot("2026-03-16T09:00:00Z", "2026-03-16T12:00:00Z")];
    const busyMap = new Map([
      ["user-1", [busy("2026-03-16T08:00:00Z", "2026-03-16T10:00:00Z")]],
    ]);

    const result = subtractBusyBlocks(slots, busyMap);
    expect(result).toEqual([
      slot("2026-03-16T10:00:00.000Z", "2026-03-16T12:00:00.000Z"),
    ]);
  });

  it("trims the end of a slot when a busy block covers the end", () => {
    const slots = [slot("2026-03-16T09:00:00Z", "2026-03-16T12:00:00Z")];
    const busyMap = new Map([
      ["user-1", [busy("2026-03-16T11:00:00Z", "2026-03-16T13:00:00Z")]],
    ]);

    const result = subtractBusyBlocks(slots, busyMap);
    expect(result).toEqual([
      slot("2026-03-16T09:00:00.000Z", "2026-03-16T11:00:00.000Z"),
    ]);
  });

  it("splits a slot into two when a busy block is in the middle", () => {
    const slots = [slot("2026-03-16T09:00:00Z", "2026-03-16T15:00:00Z")];
    const busyMap = new Map([
      ["user-1", [busy("2026-03-16T11:00:00Z", "2026-03-16T12:00:00Z")]],
    ]);

    const result = subtractBusyBlocks(slots, busyMap);
    expect(result).toEqual([
      slot("2026-03-16T09:00:00.000Z", "2026-03-16T11:00:00.000Z"),
      slot("2026-03-16T12:00:00.000Z", "2026-03-16T15:00:00.000Z"),
    ]);
  });

  it("subtracts busy blocks from multiple members", () => {
    // 9:00–15:00 slot, member A busy 10:00–11:00, member B busy 13:00–14:00
    const slots = [slot("2026-03-16T09:00:00Z", "2026-03-16T15:00:00Z")];
    const busyMap = new Map([
      ["user-a", [busy("2026-03-16T10:00:00Z", "2026-03-16T11:00:00Z")]],
      ["user-b", [busy("2026-03-16T13:00:00Z", "2026-03-16T14:00:00Z")]],
    ]);

    const result = subtractBusyBlocks(slots, busyMap);
    expect(result).toEqual([
      slot("2026-03-16T09:00:00.000Z", "2026-03-16T10:00:00.000Z"),
      slot("2026-03-16T11:00:00.000Z", "2026-03-16T13:00:00.000Z"),
      slot("2026-03-16T14:00:00.000Z", "2026-03-16T15:00:00.000Z"),
    ]);
  });

  it("drops a slot fragment shorter than 15 minutes after trimming", () => {
    // 9:00–9:20 slot, busy 9:00–9:10 → remaining 9:10–9:20 = 10 min < 15 min
    const slots = [slot("2026-03-16T09:00:00Z", "2026-03-16T09:20:00Z")];
    const busyMap = new Map([
      ["user-1", [busy("2026-03-16T09:00:00Z", "2026-03-16T09:10:00Z")]],
    ]);

    const result = subtractBusyBlocks(slots, busyMap);
    expect(result).toEqual([]);
  });

  it("has no effect when the busy block is entirely outside the slot range", () => {
    const slots = [slot("2026-03-16T09:00:00Z", "2026-03-16T12:00:00Z")];
    const busyMap = new Map([
      ["user-1", [busy("2026-03-16T14:00:00Z", "2026-03-16T15:00:00Z")]],
    ]);

    const result = subtractBusyBlocks(slots, busyMap);
    // Normalise to .000Z for comparison
    expect(result).toEqual([
      slot("2026-03-16T09:00:00.000Z", "2026-03-16T12:00:00.000Z"),
    ]);
  });

  it("handles overlapping busy blocks from different members", () => {
    // 9:00–17:00 slot, member A busy 10:00–14:00, member B busy 12:00–15:00
    // Combined busy: 10:00–15:00. Expected: [9:00–10:00, 15:00–17:00]
    const slots = [slot("2026-03-16T09:00:00Z", "2026-03-16T17:00:00Z")];
    const busyMap = new Map([
      ["user-a", [busy("2026-03-16T10:00:00Z", "2026-03-16T14:00:00Z")]],
      ["user-b", [busy("2026-03-16T12:00:00Z", "2026-03-16T15:00:00Z")]],
    ]);

    const result = subtractBusyBlocks(slots, busyMap);
    expect(result).toEqual([
      slot("2026-03-16T09:00:00.000Z", "2026-03-16T10:00:00.000Z"),
      slot("2026-03-16T15:00:00.000Z", "2026-03-16T17:00:00.000Z"),
    ]);
  });
});
