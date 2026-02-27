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

// Mock Supabase client
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn() });
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      update: mockUpdate,
    }),
  }),
}));

import { useProfileExtractionReview } from "../use-profile-extraction-review";

describe("useProfileExtractionReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
    mockUpdate.mockReturnValue({ eq: vi.fn() });
  });

  it("starts idle when shouldExtract is false", () => {
    const { result } = renderHook(() =>
      useProfileExtractionReview({
        profileId: "u1",
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
          profile: {
            full_name: "Alex Smith",
            headline: "Full-stack developer",
            skills: ["React", "TypeScript"],
            interests: ["AI", "ML"],
            location: "Berlin",
            languages: ["English", "German"],
            bio: "Experienced developer",
          },
        }),
    });

    const { result } = renderHook(() =>
      useProfileExtractionReview({
        profileId: "u1",
        sourceText: "I am Alex Smith, a developer in Berlin",
        shouldExtract: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });

    expect(result.current.extracted).toEqual({
      full_name: "Alex Smith",
      headline: "Full-stack developer",
      skills: ["React", "TypeScript"],
      interests: ["AI", "ML"],
      location: "Berlin",
      languages: ["English", "German"],
      bio: "Experienced developer",
    });
  });

  it("sets error status on extraction failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "fail" }),
    });

    const { result } = renderHook(() =>
      useProfileExtractionReview({
        profileId: "u1",
        sourceText: "some text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });
  });

  it("acceptAll calls supabase update with all fields", async () => {
    const mockEq = vi.fn();
    mockUpdate.mockReturnValue({ eq: mockEq });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          profile: {
            full_name: "Alex",
            skills: ["React"],
          },
        }),
    });

    const { result } = renderHook(() =>
      useProfileExtractionReview({
        profileId: "u1",
        sourceText: "text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });

    await act(async () => {
      await result.current.acceptAll();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.extracted).toBeNull();
  });

  it("acceptField calls update with single field", async () => {
    const mockEq = vi.fn();
    mockUpdate.mockReturnValue({ eq: mockEq });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          profile: {
            full_name: "Alex",
            headline: "Dev",
          },
        }),
    });

    const { result } = renderHook(() =>
      useProfileExtractionReview({
        profileId: "u1",
        sourceText: "text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });

    await act(async () => {
      await result.current.acceptField("full_name");
    });

    // full_name should be removed from extracted
    expect(result.current.extracted?.full_name).toBeUndefined();
    // headline should remain
    expect(result.current.extracted?.headline).toBe("Dev");
  });

  it("dismiss resets state", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          profile: { full_name: "Alex" },
        }),
    });

    const { result } = renderHook(() =>
      useProfileExtractionReview({
        profileId: "u1",
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

  it("retry re-triggers extraction", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: "fail" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            profile: { full_name: "Alex" },
          }),
      });

    const { result } = renderHook(() =>
      useProfileExtractionReview({
        profileId: "u1",
        sourceText: "some text",
        shouldExtract: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
    });

    await act(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.status).toBe("done");
    });

    expect(result.current.extracted?.full_name).toBe("Alex");
  });
});
