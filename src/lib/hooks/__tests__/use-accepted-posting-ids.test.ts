import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { SWRConfig } from "swr";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

import { useAcceptedPostingIds } from "../use-accepted-posting-ids";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    SWRConfig,
    { value: { dedupingInterval: 0, provider: () => new Map() } },
    children,
  );
}

function mockQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
  // SWR resolves the promise — return the result at the end of the chain
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAcceptedPostingIds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty Set when spaceId is null", () => {
    const { result } = renderHook(() => useAcceptedPostingIds(null), {
      wrapper,
    });
    expect(result.current.acceptedPostingIds.size).toBe(0);
  });

  it("returns empty Set when user is not logged in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useAcceptedPostingIds("space-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.acceptedPostingIds.size).toBe(0);
  });

  it("returns Set of accepted posting IDs", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = mockQuery({
      data: [
        { posting_id: "p-1", space_postings: { space_id: "space-1" } },
        { posting_id: "p-3", space_postings: { space_id: "space-1" } },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useAcceptedPostingIds("space-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.acceptedPostingIds.size).toBe(2);
    });

    expect(result.current.acceptedPostingIds.has("p-1")).toBe(true);
    expect(result.current.acceptedPostingIds.has("p-3")).toBe(true);
    expect(result.current.acceptedPostingIds.has("p-2")).toBe(false);
  });

  it("queries space_join_requests with correct filters", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });

    const chain = mockQuery({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    const { result } = renderHook(() => useAcceptedPostingIds("space-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFrom).toHaveBeenCalledWith("space_join_requests");
    expect(chain.select).toHaveBeenCalledWith(
      "posting_id, space_postings!inner(space_id)",
    );
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.eq).toHaveBeenCalledWith("status", "accepted");
    expect(chain.eq).toHaveBeenCalledWith("space_postings.space_id", "space-1");
  });
});
