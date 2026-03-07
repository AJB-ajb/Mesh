import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const mockFetch = vi.fn();
global.fetch = mockFetch;

Object.defineProperty(window, "history", {
  value: { replaceState: vi.fn() },
  writable: true,
});

// Mock Supabase — track what gets written
const mockEq = vi.fn();
const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({ update: mockUpdate }),
  }),
}));

import { useProfileExtractionReview } from "../use-profile-extraction-review";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockExtraction(profile: Record<string, unknown>) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ profile }),
  });
}

/** Render the hook and wait until extraction completes. */
async function renderExtracted(profile: Record<string, unknown>) {
  mockExtraction(profile);
  const hook = renderHook(() =>
    useProfileExtractionReview({
      profileId: "u1",
      sourceText: "some text",
      shouldExtract: true,
    }),
  );
  await waitFor(() => expect(hook.result.current.status).toBe("done"));
  return hook;
}

describe("useProfileExtractionReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ eq: mockEq });
  });

  // -----------------------------------------------------------------------
  // acceptField — per-field accept logic
  // -----------------------------------------------------------------------

  it("acceptField removes the accepted field and keeps others", async () => {
    const { result } = await renderExtracted({
      full_name: "Alex",
      headline: "Dev",
      location: "Berlin",
    });

    await act(async () => {
      await result.current.acceptField("full_name");
    });

    expect(result.current.extracted?.full_name).toBeUndefined();
    expect(result.current.extracted?.headline).toBe("Dev");
    expect(result.current.extracted?.location).toBe("Berlin");
  });

  it("acceptField writes only the single field to supabase", async () => {
    const { result } = await renderExtracted({
      full_name: "Alex",
      headline: "Dev",
    });

    await act(async () => {
      await result.current.acceptField("headline");
    });

    // update called with only the accepted field (plus updated_at)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ headline: "Dev" }),
    );
    // Should NOT contain the other field
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg).not.toHaveProperty("full_name");
  });

  it("auto-dismisses to idle status when the last field is accepted", async () => {
    const { result } = await renderExtracted({
      full_name: "Alex",
    });

    await act(async () => {
      await result.current.acceptField("full_name");
    });

    // queueMicrotask sets status to "idle" when no meaningful fields remain
    await waitFor(() => expect(result.current.status).toBe("idle"));
  });

  it("does not auto-dismiss when fields still remain after accept", async () => {
    const { result } = await renderExtracted({
      full_name: "Alex",
      headline: "Dev",
    });

    await act(async () => {
      await result.current.acceptField("full_name");
    });

    expect(result.current.status).toBe("done");
    expect(result.current.extracted?.headline).toBe("Dev");
  });

  it("acceptField is a no-op for a field not in extracted", async () => {
    const { result } = await renderExtracted({
      full_name: "Alex",
    });

    await act(async () => {
      await result.current.acceptField("bio");
    });

    // No supabase call for an absent field
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(result.current.extracted?.full_name).toBe("Alex");
  });

  // -----------------------------------------------------------------------
  // acceptAll — bulk accept
  // -----------------------------------------------------------------------

  it("acceptAll writes all extracted fields and resets state", async () => {
    const { result } = await renderExtracted({
      full_name: "Alex",
      skills: ["React", "TS"],
      location: "Berlin",
    });

    await act(async () => {
      await result.current.acceptAll();
    });

    expect(result.current.status).toBe("idle");
    expect(result.current.extracted).toBeNull();

    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg.full_name).toBe("Alex");
    expect(updateArg.skills).toEqual(["React", "TS"]);
    expect(updateArg.location).toBe("Berlin");
  });

  // -----------------------------------------------------------------------
  // Extraction field filtering — empty arrays / falsy values are dropped
  // -----------------------------------------------------------------------

  it("drops empty arrays and falsy strings from extracted result", async () => {
    const { result } = await renderExtracted({
      full_name: "Alex",
      skills: [],
      interests: [],
      headline: "",
      location: null,
      bio: "A bio",
    });

    expect(result.current.extracted).toEqual({
      full_name: "Alex",
      bio: "A bio",
    });
  });

  // -----------------------------------------------------------------------
  // dismiss / no-op guards
  // -----------------------------------------------------------------------

  it("does not extract when sourceText is only whitespace", () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ profile: {} }) });

    const { result } = renderHook(() =>
      useProfileExtractionReview({
        profileId: "u1",
        sourceText: "   ",
        shouldExtract: true,
      }),
    );

    // Should stay idle — runExtraction returns early
    expect(result.current.status).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("acceptAll is a no-op when nothing was extracted", async () => {
    const { result } = renderHook(() =>
      useProfileExtractionReview({
        profileId: "u1",
        sourceText: "text",
        shouldExtract: false,
      }),
    );

    await act(async () => {
      await result.current.acceptAll();
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
