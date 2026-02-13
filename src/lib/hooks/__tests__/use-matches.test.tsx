import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// SWR global fetcher mock — useMatches relies on SWR's default fetch
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();

// Install a global fetcher that delegates to our mock
function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: 0,
        provider: () => new Map(),
        fetcher: fetchMock,
      }}
    >
      {children}
    </SWRConfig>
  );
}

import { useMatches } from "../use-matches";

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const fakeMatches = [
  {
    id: "m1",
    posting: { id: "p1", title: "Project A" },
    profile: { user_id: "u1", full_name: "Alice" },
    score: 0.85,
    explanation: "Great match",
    score_breakdown: {
      semantic: 0.9,
      availability: 0.8,
      skill_level: 0.85,
      location: 0.7,
    },
    status: "pending",
    created_at: "2026-01-01T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useMatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    fetchMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMatches(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.matches).toEqual([]);
  });

  it("fetches matches successfully", async () => {
    fetchMock.mockResolvedValue({ matches: fakeMatches });

    const { result } = renderHook(() => useMatches(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.matches).toHaveLength(1);
    expect(result.current.matches[0].id).toBe("m1");
    expect(result.current.matches[0].score).toBe(0.85);
    expect(result.current.apiError).toBeNull();
  });

  it("returns apiError from response", async () => {
    fetchMock.mockResolvedValue({
      matches: [],
      error: "Matching service unavailable",
    });

    const { result } = renderHook(() => useMatches(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.apiError).toBe("Matching service unavailable");
    expect(result.current.matches).toEqual([]);
  });

  it("handles SWR-level fetch error", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useMatches(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.matches).toEqual([]);
  });

  it("provides mutate function for revalidation", async () => {
    fetchMock.mockResolvedValue({ matches: fakeMatches });

    const { result } = renderHook(() => useMatches(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.mutate).toBe("function");
  });
});
