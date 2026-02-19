import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSubscribe = vi.fn().mockReturnThis();
const mockOn = vi.fn().mockReturnThis();
const mockRemoveChannel = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
    channel: vi.fn().mockReturnValue({
      on: mockOn,
      subscribe: mockSubscribe,
    }),
    removeChannel: mockRemoveChannel,
  }),
}));

import { useNotifications } from "../use-notifications";

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

function mockProfileQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

function mockCountQuery(result: { count: number | null; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

function mockNotificationsListQuery(result: {
  data: unknown[];
  error: unknown;
}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    mockGetUser.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNotifications(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.userInitials).toBe("U");
  });

  it("fetches notification data successfully", async () => {
    const fakeUser = { id: "user-1" };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    // mockFrom is called three times in Promise.all:
    // 1. profiles (select -> eq -> single)
    // 2. notifications count (select -> eq -> eq)
    // 3. notifications list (select -> eq -> order -> limit)
    let notifCallCount = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return mockProfileQuery({
          data: { full_name: "John Doe" },
          error: null,
        });
      }
      // notifications table — first call is count, second is list
      notifCallCount++;
      if (notifCallCount === 1) {
        return mockCountQuery({ count: 3, error: null });
      }
      return mockNotificationsListQuery({ data: [], error: null });
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.unreadCount).toBe(3);
    expect(result.current.userInitials).toBe("JD");
    expect(result.current.notifications).toEqual([]);
  });

  it("returns defaults when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
    });

    const { result } = renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    // Defaults are returned when there is no data
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.userInitials).toBe("U");
  });
});
