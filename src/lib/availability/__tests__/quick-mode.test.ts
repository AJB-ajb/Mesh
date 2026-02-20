import { describe, it, expect } from "vitest";
import {
  gridToWindows,
  windowsToGrid,
  toggleGridSlot,
  windowsToGridWithPartial,
} from "../quick-mode";
import type { RecurringWindow } from "@/lib/types/availability";
import type { AvailabilitySlots } from "@/lib/types/profile";

describe("gridToWindows", () => {
  it("converts empty grid to empty array", () => {
    expect(gridToWindows({})).toEqual([]);
  });

  it("converts a single slot to one window", () => {
    const grid: AvailabilitySlots = { mon: ["morning"] };
    const windows = gridToWindows(grid);
    expect(windows).toEqual([
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 360,
        end_minutes: 720,
      },
    ]);
  });

  it("converts multiple slots on multiple days", () => {
    const grid: AvailabilitySlots = {
      mon: ["morning", "evening"],
      fri: ["afternoon"],
    };
    const windows = gridToWindows(grid);
    expect(windows).toHaveLength(3);
    expect(windows).toContainEqual({
      window_type: "recurring",
      day_of_week: 0,
      start_minutes: 360,
      end_minutes: 720,
    });
    expect(windows).toContainEqual({
      window_type: "recurring",
      day_of_week: 0,
      start_minutes: 1080,
      end_minutes: 1440,
    });
    expect(windows).toContainEqual({
      window_type: "recurring",
      day_of_week: 4,
      start_minutes: 720,
      end_minutes: 1080,
    });
  });

  it("ignores unknown day names", () => {
    const grid: AvailabilitySlots = { xyz: ["morning"] };
    expect(gridToWindows(grid)).toEqual([]);
  });

  it("ignores unknown slot names", () => {
    const grid: AvailabilitySlots = { mon: ["midnight"] };
    expect(gridToWindows(grid)).toEqual([]);
  });

  it("converts all 7 days with all 4 slots to 28 windows", () => {
    const grid: AvailabilitySlots = {
      mon: ["night", "morning", "afternoon", "evening"],
      tue: ["night", "morning", "afternoon", "evening"],
      wed: ["night", "morning", "afternoon", "evening"],
      thu: ["night", "morning", "afternoon", "evening"],
      fri: ["night", "morning", "afternoon", "evening"],
      sat: ["night", "morning", "afternoon", "evening"],
      sun: ["night", "morning", "afternoon", "evening"],
    };
    expect(gridToWindows(grid)).toHaveLength(28);
  });

  it("converts a night slot to correct window", () => {
    const grid: AvailabilitySlots = { fri: ["night"] };
    const windows = gridToWindows(grid);
    expect(windows).toEqual([
      {
        window_type: "recurring",
        day_of_week: 4,
        start_minutes: 0,
        end_minutes: 360,
      },
    ]);
  });
});

describe("windowsToGrid", () => {
  it("converts empty windows to empty grid", () => {
    expect(windowsToGrid([])).toEqual({});
  });

  it("converts a morning window back to grid slot", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 360,
        end_minutes: 720,
      },
    ];
    expect(windowsToGrid(windows)).toEqual({ mon: ["morning"] });
  });

  it("converts multiple windows correctly", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 360,
        end_minutes: 720,
      },
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 1080,
        end_minutes: 1440,
      },
      {
        window_type: "recurring",
        day_of_week: 6,
        start_minutes: 720,
        end_minutes: 1080,
      },
    ];
    const grid = windowsToGrid(windows);
    expect(grid.mon).toContain("morning");
    expect(grid.mon).toContain("evening");
    expect(grid.sun).toContain("afternoon");
  });

  it("converts a night window back to grid slot", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 4,
        start_minutes: 0,
        end_minutes: 360,
      },
    ];
    expect(windowsToGrid(windows)).toEqual({ fri: ["night"] });
  });

  it("maps a wide window to multiple slots", () => {
    // A window from 360 to 1440 covers morning + afternoon + evening
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 2,
        start_minutes: 360,
        end_minutes: 1440,
      },
    ];
    const grid = windowsToGrid(windows);
    expect(grid.wed).toContain("morning");
    expect(grid.wed).toContain("afternoon");
    expect(grid.wed).toContain("evening");
  });

  it("maps a full-day window to all 4 slots including night", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 0,
        end_minutes: 1440,
      },
    ];
    const grid = windowsToGrid(windows);
    expect(grid.mon).toContain("night");
    expect(grid.mon).toContain("morning");
    expect(grid.mon).toContain("afternoon");
    expect(grid.mon).toContain("evening");
  });

  it("does not map a narrow window that doesn't cover a full slot", () => {
    // A window from 400 to 700 doesn't fully cover morning (360-720)
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 400,
        end_minutes: 700,
      },
    ];
    expect(windowsToGrid(windows)).toEqual({});
  });
});

describe("toggleGridSlot", () => {
  it("adds a window when slot is off", () => {
    const result = toggleGridSlot([], "mon", "morning");
    expect(result).toEqual([
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 360,
        end_minutes: 720,
      },
    ]);
  });

  it("removes a window when slot is on", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 360,
        end_minutes: 720,
      },
    ];
    const result = toggleGridSlot(windows, "mon", "morning");
    expect(result).toEqual([]);
  });

  it("preserves other windows when toggling", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 360,
        end_minutes: 720,
      },
      {
        window_type: "recurring",
        day_of_week: 1,
        start_minutes: 720,
        end_minutes: 1080,
      },
    ];
    const result = toggleGridSlot(windows, "mon", "morning");
    expect(result).toHaveLength(1);
    expect(result[0].day_of_week).toBe(1);
  });

  it("returns unchanged array for unknown day", () => {
    const windows: RecurringWindow[] = [];
    const result = toggleGridSlot(windows, "xyz", "morning");
    expect(result).toEqual([]);
  });

  it("returns unchanged array for unknown slot", () => {
    const windows: RecurringWindow[] = [];
    const result = toggleGridSlot(windows, "mon", "midnight");
    expect(result).toEqual([]);
  });

  it("toggles night slot on", () => {
    const result = toggleGridSlot([], "sat", "night");
    expect(result).toEqual([
      {
        window_type: "recurring",
        day_of_week: 5,
        start_minutes: 0,
        end_minutes: 360,
      },
    ]);
  });

  it("toggles night slot off", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 5,
        start_minutes: 0,
        end_minutes: 360,
      },
    ];
    const result = toggleGridSlot(windows, "sat", "night");
    expect(result).toEqual([]);
  });
});

describe("gridToWindows → windowsToGrid roundtrip", () => {
  it("roundtrips correctly for standard grid", () => {
    const grid: AvailabilitySlots = {
      mon: ["morning", "evening"],
      wed: ["afternoon"],
      sat: ["morning", "afternoon", "evening"],
    };
    const windows = gridToWindows(grid);
    const result = windowsToGrid(windows);

    expect(result.mon?.sort()).toEqual(["evening", "morning"]);
    expect(result.wed).toEqual(["afternoon"]);
    expect(result.sat?.sort()).toEqual(["afternoon", "evening", "morning"]);
  });

  it("roundtrips correctly with night slot", () => {
    const grid: AvailabilitySlots = {
      mon: ["night", "morning"],
      fri: ["night", "evening"],
    };
    const windows = gridToWindows(grid);
    const result = windowsToGrid(windows);

    expect(result.mon?.sort()).toEqual(["morning", "night"]);
    expect(result.fri?.sort()).toEqual(["evening", "night"]);
  });
});

describe("windowsToGridWithPartial", () => {
  it("returns empty grid for no windows", () => {
    const result = windowsToGridWithPartial([]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("returns full for exact slot coverage", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 360,
        end_minutes: 720,
      },
    ];
    const result = windowsToGridWithPartial(windows);
    expect(result.mon?.morning).toBe("full");
  });

  it("returns partial for overlapping but not covering window", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 400,
        end_minutes: 600,
      },
    ];
    const result = windowsToGridWithPartial(windows);
    expect(result.mon?.morning).toBe("partial");
  });

  it("returns none for no overlap", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 360,
        end_minutes: 720,
      },
    ];
    const result = windowsToGridWithPartial(windows);
    expect(result.mon?.afternoon).toBeUndefined();
  });

  it("detects partial night slot coverage", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 0,
        end_minutes: 120,
      },
    ];
    const result = windowsToGridWithPartial(windows);
    expect(result.mon?.night).toBe("partial");
  });

  it("detects full night slot coverage", () => {
    const windows: RecurringWindow[] = [
      {
        window_type: "recurring",
        day_of_week: 0,
        start_minutes: 0,
        end_minutes: 360,
      },
    ];
    const result = windowsToGridWithPartial(windows);
    expect(result.mon?.night).toBe("full");
  });
});
