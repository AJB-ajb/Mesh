import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// ---------------------------------------------------------------------------
// Import after mocking
// ---------------------------------------------------------------------------

import { useSendGroupMessage } from "../use-send-group-message";

const defaultOpts = {
  postingId: "posting-1",
  postingTitle: "Test Posting",
  currentUserId: "user-1",
  senderName: "Alice",
  teamMembers: [
    { user_id: "user-1", full_name: "Alice" },
    { user_id: "user-2", full_name: "Bob" },
  ],
};

describe("useSendGroupMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: successful insert
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "msg-new",
          posting_id: "posting-1",
          sender_id: "user-1",
          content: "Hello",
          created_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      }),
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === "group_messages") return insertChain;
      if (table === "group_message_reads") return { upsert: mockUpsert };
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [{ user_id: "user-2", notification_preferences: null }],
          }),
        };
      }
      if (table === "notifications") {
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return { insert: vi.fn().mockResolvedValue({ error: null }) };
    });
  });

  it("returns isSending=false initially", () => {
    const { result } = renderHook(() => useSendGroupMessage(defaultOpts));
    expect(result.current.isSending).toBe(false);
  });

  it("returns false when content is empty", async () => {
    const { result } = renderHook(() => useSendGroupMessage(defaultOpts));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.sendMessage("  ");
    });

    expect(success).toBe(false);
  });

  it("calls optimistic message callback before insert", async () => {
    const onOptimistic = vi.fn();

    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: "msg-real",
          posting_id: "posting-1",
          sender_id: "user-1",
          content: "Hello",
          created_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      }),
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === "group_messages") return insertChain;
      if (table === "group_message_reads")
        return { upsert: vi.fn().mockResolvedValue({ error: null }) };
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ data: [] }),
        };
      }
      if (table === "notifications") {
        return { insert: vi.fn().mockResolvedValue({ error: null }) };
      }
      return {};
    });

    const { result } = renderHook(() =>
      useSendGroupMessage({
        ...defaultOpts,
        onOptimisticMessage: onOptimistic,
      }),
    );

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(onOptimistic).toHaveBeenCalledTimes(1);
    const optimistic = onOptimistic.mock.calls[0][0];
    expect(optimistic.content).toBe("Hello");
    expect(optimistic.sender_id).toBe("user-1");
    expect(optimistic.sender_name).toBe("Alice");
  });

  it("returns false when insert fails", async () => {
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: new Error("DB error"),
      }),
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === "group_messages") return insertChain;
      return { upsert: vi.fn().mockResolvedValue({ error: null }) };
    });

    const { result } = renderHook(() => useSendGroupMessage(defaultOpts));

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.sendMessage("Hello");
    });

    expect(success).toBe(false);
  });
});
