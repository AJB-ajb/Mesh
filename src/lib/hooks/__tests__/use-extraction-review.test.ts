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
    expect(result.current.extracted).toBeNull();
  });

  it("triggers extraction when shouldExtract is true", async () => {
    mockFetch.mockResolvedValueOnce({
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
    });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "Looking for devs",
        shouldExtract: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });

    expect(result.current.extracted).toEqual({
      category: "study",
      skills: ["React", "TypeScript"],
      team_size_min: 2,
      team_size_max: 4,
      estimated_time: "2 weeks",
      tags: ["hackathon"],
    });
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
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          posting: { category: "study" },
        }),
    });

    const { result } = renderHook(() =>
      useExtractionReview({
        postingId: "p1",
        sourceText: "text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.extracted).toBeNull();
  });
});
