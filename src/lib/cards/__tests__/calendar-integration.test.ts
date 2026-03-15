import { describe, it, expect } from "vitest";
import { parseResolvedSlot } from "../calendar-integration";

describe("parseResolvedSlot", () => {
  it("parses a valid ISO date string and returns start + end (1h default)", () => {
    const result = parseResolvedSlot("2026-03-18T14:00:00.000Z");
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date("2026-03-18T14:00:00.000Z"));
    expect(result!.end).toEqual(new Date("2026-03-18T15:00:00.000Z"));
  });

  it("returns a 1-hour duration by default", () => {
    const result = parseResolvedSlot("2026-03-20T09:00:00Z");
    expect(result).not.toBeNull();
    const diffMs = result!.end.getTime() - result!.start.getTime();
    expect(diffMs).toBe(60 * 60 * 1000);
  });

  it("returns null for an invalid date string", () => {
    expect(parseResolvedSlot("not-a-date")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseResolvedSlot("")).toBeNull();
  });

  it("returns null for a random non-date string", () => {
    expect(parseResolvedSlot("Tue Mar 99, 25:00 PM")).toBeNull();
  });

  it("parses a Date-parseable label like 'March 18, 2026 14:00'", () => {
    const result = parseResolvedSlot("March 18, 2026 14:00");
    expect(result).not.toBeNull();
    expect(result!.start.getFullYear()).toBe(2026);
    expect(result!.start.getMonth()).toBe(2); // March = 2
    expect(result!.start.getDate()).toBe(18);
  });
});

describe("slot_times structured path", () => {
  /**
   * createEventsForResolvedCard uses slot_times when present:
   *   1. Find the index of the resolved_slot label in options
   *   2. Use slot_times[index].start/end instead of parsing the label
   *
   * We test this logic inline since it's embedded in the async function.
   * This is a pure-logic extraction of the slot_times lookup.
   */

  function resolveSlotFromStructuredData(data: {
    resolved_slot: string;
    options: { label: string; votes: string[] }[];
    slot_times?: { start: string; end: string }[];
    duration_minutes?: number;
  }): { start: Date; end: Date } | null {
    const { resolved_slot, options, slot_times, duration_minutes } = data;

    // Try structured slot_times first
    if (slot_times) {
      const slotIndex = options.findIndex((o) => o.label === resolved_slot);
      if (slotIndex >= 0 && slot_times[slotIndex]) {
        return {
          start: new Date(slot_times[slotIndex].start),
          end: new Date(slot_times[slotIndex].end),
        };
      }
    }

    // Fall back to parsing the label
    const parsed = parseResolvedSlot(resolved_slot);
    if (parsed && duration_minutes) {
      parsed.end = new Date(
        parsed.start.getTime() + duration_minutes * 60 * 1000,
      );
    }
    return parsed;
  }

  it("uses slot_times start/end when present and matching", () => {
    const result = resolveSlotFromStructuredData({
      resolved_slot: "Fri Mar 21, 7:00 PM",
      options: [
        { label: "Fri Mar 21, 7:00 PM", votes: ["u1"] },
        { label: "Sat Mar 22, 2:00 PM", votes: [] },
      ],
      slot_times: [
        {
          start: "2026-03-21T19:00:00+01:00",
          end: "2026-03-21T21:00:00+01:00",
        },
        {
          start: "2026-03-22T14:00:00+01:00",
          end: "2026-03-22T16:00:00+01:00",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date("2026-03-21T19:00:00+01:00"));
    expect(result!.end).toEqual(new Date("2026-03-21T21:00:00+01:00"));
  });

  it("uses the second slot when it's the resolved one", () => {
    const result = resolveSlotFromStructuredData({
      resolved_slot: "Sat Mar 22, 2:00 PM",
      options: [
        { label: "Fri Mar 21, 7:00 PM", votes: [] },
        { label: "Sat Mar 22, 2:00 PM", votes: ["u1", "u2"] },
      ],
      slot_times: [
        {
          start: "2026-03-21T19:00:00+01:00",
          end: "2026-03-21T21:00:00+01:00",
        },
        {
          start: "2026-03-22T14:00:00+01:00",
          end: "2026-03-22T16:00:00+01:00",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date("2026-03-22T14:00:00+01:00"));
  });

  it("falls back to label parsing when slot_times is absent", () => {
    const result = resolveSlotFromStructuredData({
      resolved_slot: "2026-03-21T19:00:00Z",
      options: [{ label: "2026-03-21T19:00:00Z", votes: ["u1"] }],
      // no slot_times
    });

    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date("2026-03-21T19:00:00Z"));
    // Default 1h duration from parseResolvedSlot
    expect(result!.end).toEqual(new Date("2026-03-21T20:00:00Z"));
  });

  it("uses duration_minutes in the fallback path", () => {
    const result = resolveSlotFromStructuredData({
      resolved_slot: "2026-03-21T19:00:00Z",
      options: [{ label: "2026-03-21T19:00:00Z", votes: ["u1"] }],
      duration_minutes: 120,
    });

    expect(result).not.toBeNull();
    // 2 hours instead of default 1h
    expect(result!.end).toEqual(new Date("2026-03-21T21:00:00Z"));
  });

  it("falls back to label parsing when resolved_slot label not found in options", () => {
    const result = resolveSlotFromStructuredData({
      resolved_slot: "2026-03-21T19:00:00Z",
      options: [{ label: "Different label", votes: ["u1"] }],
      slot_times: [
        { start: "2026-03-21T19:00:00Z", end: "2026-03-21T21:00:00Z" },
      ],
    });

    // Falls back because label doesn't match any option
    expect(result).not.toBeNull();
    expect(result!.start).toEqual(new Date("2026-03-21T19:00:00Z"));
    // Default 1h from parseResolvedSlot
    expect(result!.end).toEqual(new Date("2026-03-21T20:00:00Z"));
  });

  it("returns null when label is unparseable and no slot_times match", () => {
    const result = resolveSlotFromStructuredData({
      resolved_slot: "some random text",
      options: [{ label: "different label", votes: ["u1"] }],
      slot_times: [
        { start: "2026-03-21T19:00:00Z", end: "2026-03-21T21:00:00Z" },
      ],
    });

    expect(result).toBeNull();
  });
});
