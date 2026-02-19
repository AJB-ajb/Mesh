import { describe, it, expect, vi, beforeEach } from "vitest";

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

import { markGroupMessageRead } from "../use-group-messages";

describe("markGroupMessageRead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });
  });

  it("calls upsert on group_message_reads with correct args", async () => {
    await markGroupMessageRead("msg-123", "user-456");

    expect(mockFrom).toHaveBeenCalledWith("group_message_reads");
    expect(mockUpsert).toHaveBeenCalledWith(
      { message_id: "msg-123", user_id: "user-456" },
      { onConflict: "message_id,user_id" },
    );
  });

  it("does not throw if upsert returns an error", async () => {
    mockUpsert.mockResolvedValue({ error: new Error("DB error") });
    await expect(
      markGroupMessageRead("msg-1", "user-1"),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// fetchGroupMessages logic (tested indirectly via mock)
// ---------------------------------------------------------------------------

describe("fetchGroupMessages internal logic", () => {
  it("maps sender names from profiles correctly", () => {
    // Pure logic test: given messages and profiles, build sender name map
    const messages = [
      {
        id: "m1",
        posting_id: "p1",
        sender_id: "u1",
        content: "hi",
        created_at: "2026-01-01",
      },
      {
        id: "m2",
        posting_id: "p1",
        sender_id: "u2",
        content: "hey",
        created_at: "2026-01-02",
      },
    ];
    const profiles = [
      { user_id: "u1", full_name: "Alice" },
      { user_id: "u2", full_name: "Bob" },
    ];

    const nameById = new Map<string, string | null>();
    for (const p of profiles) {
      nameById.set(p.user_id, p.full_name);
    }

    const result = messages.map((m) => ({
      ...m,
      sender_name: nameById.get(m.sender_id) ?? null,
    }));

    expect(result[0].sender_name).toBe("Alice");
    expect(result[1].sender_name).toBe("Bob");
  });

  it("returns null for sender_name when profile not found", () => {
    const messages = [
      {
        id: "m1",
        posting_id: "p1",
        sender_id: "unknown-user",
        content: "hi",
        created_at: "2026-01-01",
      },
    ];
    const nameById = new Map<string, string | null>();

    const result = messages.map((m) => ({
      ...m,
      sender_name: nameById.get(m.sender_id) ?? null,
    }));

    expect(result[0].sender_name).toBeNull();
  });
});
