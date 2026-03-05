import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

/** Minimal User stub for tests. */
function stubUser(overrides: Partial<User> & { id: string }) {
  return {
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    user_metadata: {},
    ...overrides,
  } as User;
}

import {
  verifyApplicationOwnership,
  verifyMatchParticipant,
  ensureProfileExists,
} from "../guards";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSupabase(overrides: Record<string, unknown> = {}) {
  return overrides as unknown as SupabaseClient;
}

function chainBuilder(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    insert: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
  };
}

// ---------------------------------------------------------------------------
// verifyApplicationOwnership
// ---------------------------------------------------------------------------

describe("verifyApplicationOwnership", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns application when user is the applicant", async () => {
    const app = { id: "app-1", applicant_id: "user-1", status: "pending" };
    const chain = chainBuilder({ data: app, error: null });
    const supabase = mockSupabase({ from: vi.fn(() => chain) });

    const result = await verifyApplicationOwnership(
      supabase,
      "app-1",
      "user-1",
    );
    expect(result).toEqual(app);
  });

  it("throws NOT_FOUND when application does not exist", async () => {
    const chain = chainBuilder({ data: null, error: { code: "PGRST116" } });
    const supabase = mockSupabase({ from: vi.fn(() => chain) });

    await expect(
      verifyApplicationOwnership(supabase, "app-missing", "user-1"),
    ).rejects.toThrow(AppError);

    await expect(
      verifyApplicationOwnership(supabase, "app-missing", "user-1"),
    ).rejects.toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });

  it("throws FORBIDDEN when user is not the applicant", async () => {
    const app = { id: "app-1", applicant_id: "user-2", status: "pending" };
    const chain = chainBuilder({ data: app, error: null });
    const supabase = mockSupabase({ from: vi.fn(() => chain) });

    await expect(
      verifyApplicationOwnership(supabase, "app-1", "user-1"),
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });
});

// ---------------------------------------------------------------------------
// verifyMatchParticipant
// ---------------------------------------------------------------------------

describe("verifyMatchParticipant", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns match when user is the match user_id", async () => {
    const match = {
      id: "m-1",
      user_id: "user-1",
      postings: { creator_id: "user-2" },
    };
    const chain = chainBuilder({ data: match, error: null });
    const supabase = mockSupabase({ from: vi.fn(() => chain) });

    const result = await verifyMatchParticipant(supabase, "m-1", "user-1");
    expect(result).toEqual(match);
  });

  it("returns match when user is the posting creator", async () => {
    const match = {
      id: "m-1",
      user_id: "user-1",
      postings: { creator_id: "user-2" },
    };
    const chain = chainBuilder({ data: match, error: null });
    const supabase = mockSupabase({ from: vi.fn(() => chain) });

    const result = await verifyMatchParticipant(supabase, "m-1", "user-2");
    expect(result).toEqual(match);
  });

  it("throws FORBIDDEN when user is neither participant", async () => {
    const match = {
      id: "m-1",
      user_id: "user-1",
      postings: { creator_id: "user-2" },
    };
    const chain = chainBuilder({ data: match, error: null });
    const supabase = mockSupabase({ from: vi.fn(() => chain) });

    await expect(
      verifyMatchParticipant(supabase, "m-1", "user-3"),
    ).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
  });

  it("throws NOT_FOUND when match doesn't exist", async () => {
    const chain = chainBuilder({ data: null, error: { code: "PGRST116" } });
    const supabase = mockSupabase({ from: vi.fn(() => chain) });

    await expect(
      verifyMatchParticipant(supabase, "m-missing", "user-1"),
    ).rejects.toMatchObject({ code: "NOT_FOUND", statusCode: 404 });
  });
});

// ---------------------------------------------------------------------------
// ensureProfileExists
// ---------------------------------------------------------------------------

describe("ensureProfileExists", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns existing profile without creating one", async () => {
    const profile = { user_id: "user-1", full_name: "Alice" };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: profile }),
    };
    const supabase = mockSupabase({ from: vi.fn(() => chain) });
    const user = stubUser({
      id: "user-1",
      user_metadata: { full_name: "Alice" },
    });

    const result = await ensureProfileExists(supabase, user);
    expect(result).toEqual(profile);
  });

  it("creates a profile when none exists", async () => {
    const created = { user_id: "user-1", full_name: "Bob" };
    const mockFrom = vi.fn();

    // First call: select (no existing profile)
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };
    // Second call: insert
    const insertChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: created, error: null }),
    };

    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(insertChain);

    const supabase = mockSupabase({ from: mockFrom });
    const user = stubUser({
      id: "user-1",
      user_metadata: { full_name: "Bob" },
      email: "bob@example.com",
    });

    const result = await ensureProfileExists(supabase, user);
    expect(result).toEqual(created);
  });
});
