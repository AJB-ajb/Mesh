import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePostingInterest } from "../use-posting-interest";

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

// ---------------------------------------------------------------------------
// Tests — optimistic update + rollback logic
// ---------------------------------------------------------------------------

describe("usePostingInterest", () => {
  const mutateMock = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically adds the id BEFORE the fetch resolves, then keeps it on success", async () => {
    // Use a deferred promise so we can inspect state mid-flight
    let resolveFetch!: (v: unknown) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((r) => {
        resolveFetch = r;
      }),
    );

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    // Start the request but don't await it yet
    let promise: Promise<void>;
    act(() => {
      promise = result.current.handleExpressInterest("posting-1");
    });

    // While fetch is still in-flight, the id should already be present
    expect(result.current.interestingIds.has("posting-1")).toBe(true);

    // Now resolve the fetch
    await act(async () => {
      resolveFetch({ ok: true, json: async () => ({}) });
      await promise!;
    });

    // Id remains after success
    expect(result.current.interestingIds.has("posting-1")).toBe(true);
  });

  it("rolls back the id when server returns a non-ok response", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Already applied" } }),
    });

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });

    expect(result.current.interestingIds.has("posting-1")).toBe(false);
    expect(result.current.interestError).toBe("Already applied");
  });

  it("rolls back the id on network failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });

    expect(result.current.interestingIds.has("posting-1")).toBe(false);
    expect(result.current.interestError).toBe("Network error");
  });

  it("only rolls back the failed id, keeping previously successful ones", async () => {
    // First request succeeds
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });

    // Second request fails
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Conflict" } }),
    });

    await act(async () => {
      await result.current.handleExpressInterest("posting-2");
    });

    expect(result.current.interestingIds.has("posting-1")).toBe(true);
    expect(result.current.interestingIds.has("posting-2")).toBe(false);
  });

  it("clears previous error when a new interest attempt starts", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Server error" } }),
    });

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });
    expect(result.current.interestError).toBe("Server error");

    // Second attempt succeeds — error should be cleared
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await act(async () => {
      await result.current.handleExpressInterest("posting-2");
    });
    expect(result.current.interestError).toBeNull();
  });

  it("uses fallback message for non-Error thrown values", async () => {
    fetchMock.mockRejectedValueOnce("string error");

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });

    expect(result.current.interestError).toBe("Failed to submit request");
  });

  it("uses fallback message when server error has no message field", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: {} }),
    });

    const { result } = renderHook(() => usePostingInterest(mutateMock));

    await act(async () => {
      await result.current.handleExpressInterest("posting-1");
    });

    expect(result.current.interestError).toBe("Failed to submit request");
  });
});
