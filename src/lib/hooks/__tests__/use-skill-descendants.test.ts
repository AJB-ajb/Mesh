import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { SWRConfig } from "swr";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

const mockRpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    rpc: mockRpc,
  }),
}));

import { useSkillDescendants } from "../use-skill-descendants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(
    SWRConfig,
    { value: { dedupingInterval: 0, provider: () => new Map() } },
    children,
  );
}

describe("useSkillDescendants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when no skills are selected", () => {
    const { result } = renderHook(() => useSkillDescendants([]), {
      wrapper,
    });

    expect(result.current.descendantIds).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("fetches descendants for selected skill IDs", async () => {
    mockRpc.mockResolvedValue({
      data: [{ id: "child-1" }, { id: "child-2" }, { id: "parent-1" }],
      error: null,
    });

    const { result } = renderHook(() => useSkillDescendants(["parent-1"]), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.descendantIds).toContain("child-1");
    });

    expect(result.current.descendantIds).toContain("child-2");
    expect(result.current.descendantIds).toContain("parent-1");
  });

  it("deduplicates descendants across multiple parents", async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: [{ id: "a" }, { id: "shared" }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ id: "b" }, { id: "shared" }],
        error: null,
      });

    const { result } = renderHook(
      () => useSkillDescendants(["parent-1", "parent-2"]),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.descendantIds.length).toBe(3);
    });

    // "shared" should appear only once
    const sharedCount = result.current.descendantIds.filter(
      (id) => id === "shared",
    ).length;
    expect(sharedCount).toBe(1);
    expect(result.current.descendantIds).toHaveLength(3);
  });

  it("propagates errors from RPC calls", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Network error" },
    });

    const { result } = renderHook(
      () => useSkillDescendants(["some-skill-id"]),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
