import { describe, it, expect } from "vitest";
import { intersectAvailability, type AvailabilitySlotsMap } from "../overlap";

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
