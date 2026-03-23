import { describe, it, expect, vi } from "vitest";

// Mock the client import to prevent actual Supabase client creation
vi.mock("../client", () => ({
  createClient: vi.fn(),
}));

import { _typeGuards } from "../realtime";

const {
  isMessage,
  isNotification,
  isConversation,
  isPresenceStateArray,
  isGroupMessage,
} = _typeGuards;

// ---------------------------------------------------------------------------
// isMessage
// ---------------------------------------------------------------------------

describe("isMessage", () => {
  it("returns true for a valid message object", () => {
    const msg = {
      id: "msg-1",
      conversation_id: "conv-1",
      sender_id: "user-1",
      content: "Hello",
      read: false,
      created_at: "2025-01-01T00:00:00Z",
    };
    expect(isMessage(msg)).toBe(true);
  });

  it("returns false when required fields are missing", () => {
    expect(isMessage({ id: "msg-1", conversation_id: "conv-1" })).toBe(false);
    expect(isMessage({ id: "msg-1", sender_id: "user-1", content: "Hi" })).toBe(
      false,
    );
  });

  it("returns false for null", () => {
    expect(isMessage(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isNotification
// ---------------------------------------------------------------------------

describe("isNotification", () => {
  it("returns true for a valid notification object", () => {
    const notif = {
      id: "notif-1",
      user_id: "user-1",
      type: "match",
      title: "New match",
      body: null,
      read: false,
      related_posting_id: null,
      related_application_id: null,
      related_user_id: null,
      created_at: "2025-01-01T00:00:00Z",
    };
    expect(isNotification(notif)).toBe(true);
  });

  it("returns false when required fields are missing", () => {
    expect(
      isNotification({ id: "notif-1", user_id: "user-1", type: "match" }),
    ).toBe(false);
  });

  it("returns false for null", () => {
    expect(isNotification(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isConversation
// ---------------------------------------------------------------------------

describe("isConversation", () => {
  it("returns true for a valid conversation object", () => {
    const conv = {
      id: "conv-1",
      participant_1: "user-1",
      participant_2: "user-2",
      last_message_at: null,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
    };
    expect(isConversation(conv)).toBe(true);
  });

  it("returns false when required fields are missing", () => {
    expect(isConversation({ id: "conv-1", participant_1: "user-1" })).toBe(
      false,
    );
  });

  it("returns false for null", () => {
    expect(isConversation(null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isPresenceStateArray
// ---------------------------------------------------------------------------

describe("isPresenceStateArray", () => {
  it("returns true for a valid array of presence states", () => {
    const arr = [
      { user_id: "user-1", online_at: "2025-01-01T00:00:00Z" },
      {
        user_id: "user-2",
        online_at: "2025-01-01T00:00:00Z",
        typing_in: "conv-1",
      },
    ];
    expect(isPresenceStateArray(arr)).toBe(true);
  });

  it("returns true for an empty array", () => {
    expect(isPresenceStateArray([])).toBe(true);
  });

  it("returns false for an array with missing user_id", () => {
    const arr = [{ online_at: "2025-01-01T00:00:00Z" }];
    expect(isPresenceStateArray(arr)).toBe(false);
  });

  it("returns false for a non-array value", () => {
    expect(isPresenceStateArray("not-an-array")).toBe(false);
    expect(isPresenceStateArray(null)).toBe(false);
    expect(isPresenceStateArray(42)).toBe(false);
    expect(isPresenceStateArray({})).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isGroupMessage
// ---------------------------------------------------------------------------

describe("isGroupMessage", () => {
  it("returns true for a valid group message object", () => {
    const msg = {
      id: "gm-1",
      posting_id: "posting-1",
      sender_id: "user-1",
      content: "Hello team!",
      created_at: "2026-01-01T00:00:00Z",
    };
    expect(isGroupMessage(msg)).toBe(true);
  });

  it("returns false when posting_id is missing", () => {
    expect(
      isGroupMessage({
        id: "gm-1",
        sender_id: "user-1",
        content: "Hello",
        created_at: "2026-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("returns false when id is missing", () => {
    expect(
      isGroupMessage({
        posting_id: "posting-1",
        sender_id: "user-1",
        content: "Hello",
        created_at: "2026-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("returns false when content is missing", () => {
    expect(
      isGroupMessage({
        id: "gm-1",
        posting_id: "posting-1",
        sender_id: "user-1",
        created_at: "2026-01-01T00:00:00Z",
      }),
    ).toBe(false);
  });

  it("returns false for null", () => {
    expect(isGroupMessage(null)).toBe(false);
  });

  it("returns false for non-object values", () => {
    expect(isGroupMessage("string")).toBe(false);
    expect(isGroupMessage(42)).toBe(false);
    expect(isGroupMessage(undefined)).toBe(false);
  });
});
