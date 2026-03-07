import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

// Stub window.history.replaceState so removeQueryParam doesn't throw
Object.defineProperty(window, "history", {
  value: { replaceState: vi.fn() },
  writable: true,
});

import { useExtractionReview } from "../use-extraction-review";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Simulate a successful extraction API response followed by a successful PATCH. */
function mockExtractionAndPatch(extracted: Record<string, unknown>) {
  mockFetch
    .mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ posting: extracted }),
    })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
}

/** Extract the PATCH body sent to /api/postings/:id from mock call history. */
function patchBodies(): Record<string, unknown>[] {
  return (mockFetch.mock.calls as [string, RequestInit][])
    .filter(([url, opts]) => url.startsWith("/api/postings/") && opts?.method === "PATCH")
    .map(([, opts]) => JSON.parse(opts.body as string));
}

describe("useExtractionReview", () => {
  beforeEach(() => vi.clearAllMocks());

  // -----------------------------------------------------------------------
  // buildPatchPayload — skips fields when user already set non-default values
  // -----------------------------------------------------------------------

  it("skips team_size_min when user already changed it from the default (1)", async () => {
    mockExtractionAndPatch({
      category: "study",
      team_size_min: 3,
      team_size_max: 6,
    });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "text",
        shouldExtract: true,
        currentPosting: { team_size_min: 2, team_size_max: 5 }, // min changed from default 1
      }),
    );

    await waitFor(() => expect(result.current.status).toBe("applied"));

    const [patch] = patchBodies();
    // team_size_min should NOT be in the patch — user already set it to 2 (non-default)
    expect(patch).not.toHaveProperty("teamSizeMin");
    // team_size_max = 5 is the default, so userSetMax = false, extraction IS applied
    expect(patch).toHaveProperty("teamSizeMax", "6");
  });

  it("applies team sizes when user has not changed from defaults", async () => {
    mockExtractionAndPatch({
      team_size_min: 2,
      team_size_max: 8,
    });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "text",
        shouldExtract: true,
        currentPosting: { team_size_min: 1, team_size_max: 5 }, // defaults
      }),
    );

    await waitFor(() => expect(result.current.status).toBe("applied"));

    const [patch] = patchBodies();
    expect(patch).toHaveProperty("teamSizeMin", "2");
    expect(patch).toHaveProperty("teamSizeMax", "8");
  });

  it("joins skills array into comma-separated string for the PATCH", async () => {
    mockExtractionAndPatch({ skills: ["React", "TypeScript", "Node"] });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => expect(result.current.status).toBe("applied"));

    const [patch] = patchBodies();
    expect(patch.skills).toBe("React, TypeScript, Node");
  });

  it("sends no PATCH when extraction returns only falsy fields", async () => {
    // All falsy: "" and null become undefined via `|| undefined` in runExtraction
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          posting: { category: "", skills: null, tags: null, estimated_time: "" },
        }),
    });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => expect(result.current.status).toBe("applied"));

    // Only the extraction POST should have been called — no PATCH
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe("/api/extract/posting");
  });

  // -----------------------------------------------------------------------
  // Undo — rollback with snapshot of pre-extraction values
  // -----------------------------------------------------------------------

  it("undo PATCHes the snapshot of original values back", async () => {
    const currentPosting = {
      category: "other",
      skills: ["Python"],
      tags: ["old-tag"],
    };

    mockExtractionAndPatch({
      category: "study",
      skills: ["React"],
      tags: ["new-tag"],
    });
    // Third fetch call is the undo PATCH
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

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

    await waitFor(() => expect(result.current.status).toBe("applied"));

    await act(async () => {
      await result.current.undo();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.appliedFields).toBeNull();

    // The undo PATCH should restore original values
    const patches = patchBodies();
    const undoPatch = patches[1]; // second PATCH = undo
    expect(undoPatch).toEqual({
      category: "other",
      skills: "Python",
      tags: "old-tag",
    });

    // onMutate called for both apply and undo
    expect(onMutate).toHaveBeenCalledTimes(2);
  });

  it("undo is a no-op when there is no snapshot (no currentPosting)", async () => {
    mockExtractionAndPatch({ category: "study" });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "text",
        shouldExtract: true,
        // no currentPosting → no snapshot
      }),
    );

    await waitFor(() => expect(result.current.status).toBe("applied"));

    await act(async () => {
      await result.current.undo();
    });

    // No undo PATCH sent — only extraction + auto-apply
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // -----------------------------------------------------------------------
  // State machine edge cases
  // -----------------------------------------------------------------------

  it("does not extract when sourceText is empty/whitespace", async () => {
    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "   ",
        shouldExtract: true,
      }),
    );

    // Should stay idle — runExtraction exits early
    expect(result.current.status).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("transitions to error when extraction API fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "fail" }),
    });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => expect(result.current.status).toBe("error"));
  });

  it("dismiss clears applied state back to idle", async () => {
    mockExtractionAndPatch({ category: "study" });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => expect(result.current.status).toBe("applied"));

    act(() => result.current.dismiss());

    expect(result.current.status).toBe("idle");
    expect(result.current.appliedFields).toBeNull();
  });
});
