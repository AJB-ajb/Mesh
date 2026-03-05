import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mocks for sub-hooks
// ---------------------------------------------------------------------------

const mockWindows = {
  recurringWindows: [
    { window_type: "recurring" as const, day_of_week: 1, start_minutes: 540, end_minutes: 1020 },
  ],
  specificWindows: [],
  isLoading: false,
  error: undefined,
  replaceWindows: vi.fn(),
  mutate: vi.fn(),
};

const mockBusyBlocks = {
  busyWindows: [
    { window_type: "recurring" as const, day_of_week: 2, start_minutes: 600, end_minutes: 660 },
  ],
  isLoading: false,
  error: undefined,
  mutate: vi.fn(),
};

const mockCommonAvailability = {
  windows: [
    { day_of_week: 1, start_minutes: 600, end_minutes: 720 },
  ],
  isLoading: false,
  error: undefined,
};

const mockProposals = {
  proposals: [
    {
      id: "proposal-1",
      posting_id: "posting-1",
      proposed_by: "user-1",
      title: "Standup",
      start_time: "2026-03-10T09:00:00Z",
      end_time: "2026-03-10T09:30:00Z",
      status: "proposed" as const,
      created_at: "2026-03-05T00:00:00Z",
      updated_at: "2026-03-05T00:00:00Z",
    },
  ],
  isLoading: false,
  error: undefined,
  mutate: vi.fn(),
};

const mockConnections = {
  connections: [
    { id: "conn-1", provider: "google", email: "user@gmail.com" },
  ],
  isLoading: false,
  error: undefined,
  mutate: vi.fn(),
};

vi.mock("../use-availability-windows", () => ({
  useAvailabilityWindows: vi.fn(() => mockWindows),
}));

vi.mock("../use-calendar-busy-blocks", () => ({
  useCalendarBusyBlocks: vi.fn(() => mockBusyBlocks),
}));

vi.mock("../use-common-availability", () => ({
  useCommonAvailability: vi.fn(() => mockCommonAvailability),
}));

vi.mock("../use-meeting-proposals", () => ({
  useMeetingProposals: vi.fn(() => mockProposals),
}));

vi.mock("../use-calendar-connections", () => ({
  useCalendarConnections: vi.fn(() => mockConnections),
}));

// ---------------------------------------------------------------------------
// Import after mocking
// ---------------------------------------------------------------------------

import { useAvailability } from "../use-availability";
import { useAvailabilityWindows } from "../use-availability-windows";
import { useCalendarBusyBlocks } from "../use-calendar-busy-blocks";
import { useCommonAvailability } from "../use-common-availability";
import { useMeetingProposals } from "../use-meeting-proposals";
import { useCalendarConnections } from "../use-calendar-connections";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("composes all sub-hook data into a unified return", () => {
    const { result } = renderHook(() =>
      useAvailability({ postingId: "posting-1", userId: "user-1" }),
    );

    // Personal availability
    expect(result.current.recurringWindows).toEqual(mockWindows.recurringWindows);
    expect(result.current.specificWindows).toEqual(mockWindows.specificWindows);

    // Calendar busy blocks
    expect(result.current.busyBlocks).toEqual(mockBusyBlocks.busyWindows);

    // Calendar connections
    expect(result.current.connections).toEqual(mockConnections.connections);

    // Common availability
    expect(result.current.commonSlots).toEqual(mockCommonAvailability.windows);

    // Meeting proposals
    expect(result.current.proposals).toEqual(mockProposals.proposals);

    // Loading
    expect(result.current.isLoading).toBe(false);
  });

  it("passes userId as profileId to useAvailabilityWindows by default", () => {
    renderHook(() =>
      useAvailability({ postingId: "posting-1", userId: "user-1" }),
    );

    expect(useAvailabilityWindows).toHaveBeenCalledWith({
      profileId: "user-1",
    });
  });

  it("uses explicit windowOwner when provided", () => {
    renderHook(() =>
      useAvailability({
        postingId: "posting-1",
        userId: "user-1",
        windowOwner: { postingId: "posting-1" },
      }),
    );

    expect(useAvailabilityWindows).toHaveBeenCalledWith({
      postingId: "posting-1",
    });
  });

  it("passes postingId to useCommonAvailability and useMeetingProposals", () => {
    renderHook(() =>
      useAvailability({ postingId: "posting-1", userId: "user-1" }),
    );

    expect(useCommonAvailability).toHaveBeenCalledWith("posting-1");
    expect(useMeetingProposals).toHaveBeenCalledWith("posting-1");
  });

  it("passes userId to useCalendarBusyBlocks", () => {
    renderHook(() =>
      useAvailability({ postingId: "posting-1", userId: "user-1" }),
    );

    expect(useCalendarBusyBlocks).toHaveBeenCalledWith("user-1");
  });

  it("calls useCalendarConnections with no args", () => {
    renderHook(() =>
      useAvailability({ postingId: "posting-1", userId: "user-1" }),
    );

    expect(useCalendarConnections).toHaveBeenCalled();
  });

  it("exposes replaceWindows and mutation helpers", () => {
    const { result } = renderHook(() =>
      useAvailability({ postingId: "posting-1", userId: "user-1" }),
    );

    expect(typeof result.current.replaceWindows).toBe("function");
    expect(typeof result.current.mutateWindows).toBe("function");
    expect(typeof result.current.mutateConnections).toBe("function");
    expect(typeof result.current.mutateProposals).toBe("function");
  });

  it("reports isLoading true when any sub-hook is loading", () => {
    // Override one sub-hook to be loading
    vi.mocked(useAvailabilityWindows).mockReturnValue({
      ...mockWindows,
      isLoading: true,
    });

    const { result } = renderHook(() =>
      useAvailability({ postingId: "posting-1", userId: "user-1" }),
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("handles null postingId gracefully", () => {
    renderHook(() =>
      useAvailability({ postingId: null, userId: "user-1" }),
    );

    expect(useCommonAvailability).toHaveBeenCalledWith(null);
    expect(useMeetingProposals).toHaveBeenCalledWith(null);
  });

  it("handles null userId gracefully", () => {
    renderHook(() =>
      useAvailability({ postingId: "posting-1", userId: null }),
    );

    expect(useAvailabilityWindows).toHaveBeenCalledWith(null);
    expect(useCalendarBusyBlocks).toHaveBeenCalledWith(null);
  });
});
