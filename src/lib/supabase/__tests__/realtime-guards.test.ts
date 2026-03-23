import { describe, it, expect, vi } from "vitest";

// Mock the client import to prevent actual Supabase client creation
vi.mock("../client", () => ({
  createClient: vi.fn(),
}));

import { _typeGuards } from "../realtime";

const { isNotification, isPresenceStateArray } = _typeGuards;

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
