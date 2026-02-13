import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Supabase mock — useInboxData and useConversationMessages use createClient
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

import { useInboxData, useConversationMessages } from "../use-inbox";

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

function mockQuery(result: { data: unknown; error?: unknown; count?: number }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  };
  chain.then = vi.fn((resolve: (v: unknown) => void) =>
    resolve({ ...result, count: result.count ?? 0 }),
  );
  return chain;
}

const fakeUser = { id: "user-1", email: "user@test.com" };

// ---------------------------------------------------------------------------
// useInboxData tests
// ---------------------------------------------------------------------------

describe("useInboxData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    mockGetUser.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useInboxData(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.notifications).toEqual([]);
    expect(result.current.conversations).toEqual([]);
  });

  it("fetches notifications and conversations", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const fakeNotifications = [
      {
        id: "n1",
        user_id: "user-1",
        type: "match",
        title: "New match!",
        body: "You matched",
        read: false,
        created_at: "2026-01-01T00:00:00Z",
      },
    ];

    const fakeConversations = [
      {
        id: "conv-1",
        participant_1: "user-1",
        participant_2: "user-2",
        posting_id: "p1",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // notifications
        return mockQuery({ data: fakeNotifications });
      }
      if (callCount === 2) {
        // conversations
        return mockQuery({ data: fakeConversations });
      }
      if (callCount === 3) {
        // other user profile
        return mockQuery({
          data: { full_name: "User 2", headline: "Dev", user_id: "user-2" },
        });
      }
      if (callCount === 4) {
        // posting
        return mockQuery({ data: { title: "Project A" } });
      }
      if (callCount === 5) {
        // last message
        return mockQuery({
          data: {
            content: "Hello",
            created_at: "2026-01-01T00:00:00Z",
            sender_id: "user-2",
          },
        });
      }
      // unread count
      return mockQuery({ data: null, count: 1 });
    });

    const { result } = renderHook(() => useInboxData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.conversations).toHaveLength(1);
    expect(result.current.currentUserId).toBe("user-1");
  });

  it("handles unauthenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useInboxData(), { wrapper });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it("handles empty inbox", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    mockFrom.mockReturnValue(mockQuery({ data: [] }));

    const { result } = renderHook(() => useInboxData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.notifications).toEqual([]);
    expect(result.current.conversations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// useConversationMessages tests
// ---------------------------------------------------------------------------

describe("useConversationMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch when conversationId is null", () => {
    const { result } = renderHook(
      () => useConversationMessages(null, "user-1"),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.messages).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("does not fetch when currentUserId is null", () => {
    const { result } = renderHook(
      () => useConversationMessages("conv-1", null),
      { wrapper },
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.messages).toEqual([]);
  });

  it("fetches messages for a conversation", async () => {
    const fakeMessages = [
      {
        id: "msg-1",
        conversation_id: "conv-1",
        sender_id: "user-2",
        content: "Hello",
        read: false,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "msg-2",
        conversation_id: "conv-1",
        sender_id: "user-1",
        content: "Hi there",
        read: true,
        created_at: "2026-01-01T00:01:00Z",
      },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // fetch messages
        return mockQuery({ data: fakeMessages });
      }
      // mark as read (fire and forget — returns a thenable chain)
      const updateChain: Record<string, ReturnType<typeof vi.fn>> = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        then: vi.fn((resolve: (v: unknown) => void) =>
          resolve({ error: null }),
        ),
      };
      return updateChain;
    });

    const { result } = renderHook(
      () => useConversationMessages("conv-1", "user-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].content).toBe("Hello");
  });

  it("handles fetch error", async () => {
    mockFrom.mockReturnValue(
      mockQuery({ data: null, error: { message: "DB error" } }),
    );

    const { result } = renderHook(
      () => useConversationMessages("conv-1", "user-1"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.messages).toEqual([]);
  });
});
