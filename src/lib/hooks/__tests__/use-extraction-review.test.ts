import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.history.replaceState
const mockReplaceState = vi.fn();
Object.defineProperty(window, "history", {
  value: { replaceState: mockReplaceState },
  writable: true,
});

import { useExtractionReview } from "../use-extraction-review";

describe("useExtractionReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it("starts idle when shouldExtract is false", () => {
    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "some text",
        shouldExtract: false,
      }),
    );
    expect(result.current.status).toBe("idle");
    expect(result.current.appliedFields).toBeNull();
  });

  it("auto-applies extracted fields and transitions to applied", async () => {
    // First call: extraction API, second call: PATCH
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            posting: {
              category: "study",
              skills: ["React", "TypeScript"],
              team_size_min: 2,
              team_size_max: 4,
              estimated_time: "2 weeks",
              tags: ["hackathon"],
            },
          }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const onMutate = vi.fn();
    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "Looking for devs",
        shouldExtract: true,
        onMutate,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("applied");
    });

    expect(result.current.appliedFields).toEqual({
      category: "study",
      skills: ["React", "TypeScript"],
      team_size_min: 2,
      team_size_max: 4,
      estimated_time: "2 weeks",
      tags: ["hackathon"],
    });

    // Verify extraction + auto-apply PATCH were called
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/extract/posting",
      expect.anything(),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/postings/p1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(onMutate).toHaveBeenCalled();
  });

  it("sets error status on extraction failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "fail" }),
    });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "some text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("dismiss resets state", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            posting: { category: "study" },
          }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("applied");
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.appliedFields).toBeNull();
  });

  it("undo reverts fields via PATCH and calls onMutate", async () => {
    const currentPosting = {
      category: "other",
      skills: ["Python"],
      team_size_min: 1,
      team_size_max: 2,
      estimated_time: "1 week",
      tags: ["old"],
    };

    // extraction API, auto-apply PATCH, undo PATCH
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            posting: {
              category: "study",
              skills: ["React"],
              team_size_min: 3,
              team_size_max: 5,
              estimated_time: "2 weeks",
              tags: ["new"],
            },
          }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const onMutate = vi.fn();
    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "text",
        shouldExtract: true,
        currentPosting,
        onMutate,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("applied");
    });

    await act(async () => {
      await result.current.undo();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.appliedFields).toBeNull();
    // Verify all three requests were made: extract, auto-apply, undo
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/extract/posting",
      expect.anything(),
    );
    // Two PATCH calls: auto-apply + undo
    const patchCalls = (mockFetch.mock.calls as [string, RequestInit][]).filter(
      ([url, opts]) =>
        url === "/api/postings/p1" && opts?.method === "PATCH",
    );
    expect(patchCalls).toHaveLength(2);
    // onMutate called for both auto-apply and undo
    expect(onMutate.mock.calls).toHaveLength(2);
  });
});
