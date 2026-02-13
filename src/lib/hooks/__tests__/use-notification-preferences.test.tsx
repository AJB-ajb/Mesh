import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";
import { defaultNotificationPreferences } from "@/lib/notifications/preferences";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  }),
}));

import { useNotificationPreferences } from "../use-notification-preferences";

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

function mockQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  };
  return chain;
}

const fakeUser = {
  id: "user-1",
  email: "user@test.com",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useNotificationPreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns default preferences while loading", () => {
    mockGetUser.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper,
    });

    expect(result.current.preferences).toEqual(defaultNotificationPreferences);
    expect(result.current.isLoading).toBe(true);
  });

  it("fetches preferences from profile", async () => {
    const customPrefs = {
      ...defaultNotificationPreferences,
      in_app: {
        ...defaultNotificationPreferences.in_app,
        new_message: false,
      },
    };

    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(
      mockQuery({
        data: { notification_preferences: customPrefs },
        error: null,
      }),
    );

    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences.in_app.new_message).toBe(false);
  });

  it("returns default preferences when profile has no preferences", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(
      mockQuery({
        data: { notification_preferences: null },
        error: null,
      }),
    );

    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toEqual(defaultNotificationPreferences);
  });

  it("returns default preferences when profile fetch fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(
      mockQuery({
        data: null,
        error: { message: "Not found" },
      }),
    );

    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.preferences).toEqual(defaultNotificationPreferences);
  });

  it("calls supabase update when updatePreferences is called", async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    // First call for initial fetch
    mockFrom.mockReturnValue(
      mockQuery({
        data: { notification_preferences: defaultNotificationPreferences },
        error: null,
      }),
    );

    const { result } = renderHook(() => useNotificationPreferences(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Setup mock for update call
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { notification_preferences: defaultNotificationPreferences },
                error: null,
              }),
            }),
          }),
          update: mockUpdate,
        };
      }
      return mockQuery({ data: null, error: null });
    });

    const newPrefs = {
      ...defaultNotificationPreferences,
      in_app: {
        ...defaultNotificationPreferences.in_app,
        new_message: false,
      },
    };

    await act(async () => {
      await result.current.updatePreferences(newPrefs);
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        notification_preferences: newPrefs,
      }),
    );
  });
});
