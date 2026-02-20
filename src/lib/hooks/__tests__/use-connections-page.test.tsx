import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { useConnectionsPage } from "../use-connections-page";

// ---------------------------------------------------------------------------
// SWR wrapper (fresh cache per test)
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      {children}
    </SWRConfig>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildChain(resolved: unknown) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockResolvedValue(resolved),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    head: false as unknown,
  };

  // Make it work both as a promise and chainable
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useConnectionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    mockGetUser.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useConnectionsPage(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.mergedConnections).toEqual([]);
    expect(result.current.pendingIncoming).toEqual([]);
  });

  it("throws when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const { result } = renderHook(() => useConnectionsPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.mergedConnections).toEqual([]);
  });

  it("returns empty arrays when user has no connections", async () => {
    const mockUser = { id: "user-1" };
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "friendships") {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === "conversations") {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return buildChain({ data: [], error: null });
    });

    const { result } = renderHook(() => useConnectionsPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.mergedConnections).toEqual([]);
    expect(result.current.pendingIncoming).toEqual([]);
    expect(result.current.currentUserId).toBe("user-1");
  });

  it("separates accepted and pending incoming connections", async () => {
    const mockUser = { id: "user-1" };
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const friendshipsData = [
      {
        id: "f-1",
        user_id: "user-1",
        friend_id: "user-2",
        status: "accepted",
        created_at: "2026-01-01T00:00:00Z",
        friend: { user_id: "user-2", full_name: "Alice", headline: "Dev" },
        user: { user_id: "user-1", full_name: "Current User", headline: null },
      },
      {
        id: "f-2",
        user_id: "user-3",
        friend_id: "user-1",
        status: "pending",
        created_at: "2026-01-02T00:00:00Z",
        friend: { user_id: "user-1", full_name: "Current User", headline: null },
        user: { user_id: "user-3", full_name: "Bob", headline: "Designer" },
      },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "friendships") {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ data: friendshipsData, error: null }),
        };
      }
      if (table === "conversations") {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === "messages") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          neq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        };
      }
      if (table === "postings") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return buildChain({ data: null, error: null });
    });

    const { result } = renderHook(() => useConnectionsPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // One accepted connection
    expect(result.current.mergedConnections).toHaveLength(1);
    expect(result.current.mergedConnections[0].otherUser.full_name).toBe("Alice");
    expect(result.current.mergedConnections[0].friendshipId).toBe("f-1");

    // One pending incoming
    expect(result.current.pendingIncoming).toHaveLength(1);
    expect(result.current.pendingIncoming[0].otherUser.full_name).toBe("Bob");
    expect(result.current.pendingIncoming[0].friendshipId).toBe("f-2");
  });

  it("provides mutate function", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "friendships") {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      if (table === "conversations") {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return buildChain({ data: null, error: null });
    });

    const { result } = renderHook(() => useConnectionsPage(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.mutate).toBe("function");
  });
});
