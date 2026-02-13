import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePostingInterest } from "../use-posting-interest";

// ---------------------------------------------------------------------------
// Mock the global fetch
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePostingInterest", () => {
  const mutateMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts with empty state", () => {
    const { result } = renderHook(() => usePostingInterest(mutateMock));

    expect(result.current.interestingIds.size).toBe(0);
    expect(result.current.interestError).toBeNull();
  });

  it("adds posting to interestingIds optimistically", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/matches/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posting_id: "posting-1" }),
    });
    expect(mutateMock).toHaveBeenCalled();
  });

  it("removes posting from interestingIds on error", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Already interested" } }),
    });

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });

    expect(result.current.interestingIds.has("posting-1")).toBe(false);
    expect(result.current.interestError).toBe("Already interested");
  });

  it("handles network error", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });

    expect(result.current.interestingIds.has("posting-1")).toBe(false);
    expect(result.current.interestError).toBe("Network error");
  });

  it("clears previous error on new interest attempt", async () => {
    // First call fails
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Server error" } }),
    });

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });

    expect(result.current.interestError).toBe("Server error");

    // Second call succeeds
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await act(async () => {
      await result.current.handleExpressInterest("posting-2");
    });

    expect(result.current.interestError).toBeNull();
  });

  it("handles non-Error thrown values", async () => {
    fetchMock.mockRejectedValueOnce("string error");

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });

    expect(result.current.interestError).toBe("Failed to express interest");
  });
});
