import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getBookmarkedPostingIds, toggleBookmark } from "../bookmarks";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSupabase(fromImpl: ReturnType<typeof vi.fn>) {
  return { from: fromImpl } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getBookmarkedPostingIds", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an array of posting IDs", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        data: [{ posting_id: "p1" }, { posting_id: "p2" }],
        error: null,
      }),
    };
    const supabase = mockSupabase(vi.fn(() => chain));

    const result = await getBookmarkedPostingIds(supabase, "u1");
    expect(result).toEqual(["p1", "p2"]);
  });

  it("returns empty array when no bookmarks", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const supabase = mockSupabase(vi.fn(() => chain));

    const result = await getBookmarkedPostingIds(supabase, "u1");
    expect(result).toEqual([]);
  });
});

describe("toggleBookmark", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes bookmark and returns false when it exists", async () => {
    const mockFrom = vi.fn();
    // First call: check existing
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi
        .fn()
        .mockResolvedValue({ data: { id: "bk-1" }, error: null }),
    };
    // Second call: delete
    const deleteChain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(deleteChain);

    const supabase = mockSupabase(mockFrom);
    const result = await toggleBookmark(supabase, "u1", "p1");
    expect(result).toBe(false);
  });

  it("creates bookmark and returns true when it doesn't exist", async () => {
    const mockFrom = vi.fn();
    // First call: check existing (none)
    const selectChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    // Second call: insert
    const insertChain = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValueOnce(selectChain).mockReturnValueOnce(insertChain);

    const supabase = mockSupabase(mockFrom);
    const result = await toggleBookmark(supabase, "u1", "p1");
    expect(result).toBe(true);
  });
});
