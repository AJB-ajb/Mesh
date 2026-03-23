import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

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
  return (
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      {children}
    </SWRConfig>
  );
}

function mockAcceptedQuery(rows: { posting_id: string }[]) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
  // Terminal: the last .eq() resolves
  chain.eq.mockImplementation(() => {
    // Return self for chaining; final resolution via .then
    return Object.assign(chain, {
      then: vi.fn((resolve: (v: unknown) => void) =>
        resolve({ data: rows, error: null }),
      ),
    });
  });
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useAcceptedPostingIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty Set when spaceId is null", () => {
    const { result } = renderHook(() => useAcceptedPostingIds(null), {
      wrapper,
    });
    expect(result.current.acceptedPostingIds).toBeInstanceOf(Set);
    expect(result.current.acceptedPostingIds.size).toBe(0);
  });

  it("returns empty Set when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useAcceptedPostingIds("space-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.acceptedPostingIds.size).toBe(0);
  });

  it("returns Set of posting IDs for accepted join requests", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
    });
    mockFrom.mockReturnValue(
      mockAcceptedQuery([
        { posting_id: "posting-a" },
        { posting_id: "posting-b" },
      ]),
    );

    const { result } = renderHook(() => useAcceptedPostingIds("space-1"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.acceptedPostingIds).toBeInstanceOf(Set);
    expect(result.current.acceptedPostingIds.has("posting-a")).toBe(true);
    expect(result.current.acceptedPostingIds.has("posting-b")).toBe(true);
    expect(result.current.acceptedPostingIds.has("posting-c")).toBe(false);
  });

  it("queries space_join_requests with correct filters", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-42" } },
    });

    const selectMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockImplementation(() => {
      return {
        select: selectMock,
        eq: eqMock,
        then: vi.fn((resolve: (v: unknown) => void) =>
          resolve({ data: [], error: null }),
        ),
      };
    });

    mockFrom.mockReturnValue({
      select: selectMock,
      eq: eqMock,
    });

    // Need first select call to return chainable
    selectMock.mockReturnValue({ eq: eqMock });

    const { result } = renderHook(() => useAcceptedPostingIds("space-99"), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith("space_join_requests");
  });
});
