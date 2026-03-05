import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getApplication,
  getApplicationForPosting,
  createApplication,
  updateApplicationStatus,
  countApplicationsByStatus,
} from "../applications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSupabase(fromImpl: ReturnType<typeof vi.fn>) {
  return { from: fromImpl } as unknown as SupabaseClient;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getApplication", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns application when found", async () => {
    const app = { id: "a1", status: "pending" };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: app, error: null }),
    };
    const supabase = mockSupabase(vi.fn(() => chain));

    expect(await getApplication(supabase, "a1")).toEqual(app);
  });

  it("returns null when not found (PGRST116)", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      }),
    };
    const supabase = mockSupabase(vi.fn(() => chain));

    expect(await getApplication(supabase, "missing")).toBeNull();
  });
});

describe("getApplicationForPosting", () => {
  it("returns application for the given posting and user", async () => {
    const app = { id: "a1", posting_id: "p1", applicant_id: "u1" };
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: app, error: null }),
    };
    const supabase = mockSupabase(vi.fn(() => chain));

    expect(await getApplicationForPosting(supabase, "p1", "u1")).toEqual(app);
  });

  it("returns null when user has not applied", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const supabase = mockSupabase(vi.fn(() => chain));

    expect(await getApplicationForPosting(supabase, "p1", "u1")).toBeNull();
  });
});

describe("createApplication", () => {
  it("returns inserted row", async () => {
    const created = { id: "a-new", status: "pending" };
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: created, error: null }),
    };
    const supabase = mockSupabase(vi.fn(() => chain));

    const result = await createApplication(supabase, {
      posting_id: "p1",
      applicant_id: "u1",
    });
    expect(result).toEqual(created);
  });
});

describe("updateApplicationStatus", () => {
  it("updates without error", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    const supabase = mockSupabase(vi.fn(() => chain));

    await expect(
      updateApplicationStatus(supabase, "a1", "accepted"),
    ).resolves.toBeUndefined();
  });
});

describe("countApplicationsByStatus", () => {
  it("returns the count", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // The last .eq() call resolves the query
    const lastEq = vi.fn().mockResolvedValue({ count: 3, error: null });
    chain.eq
      .mockReturnValueOnce(chain) // first eq (posting_id)
      .mockImplementation(lastEq); // second eq (status)

    const supabase = mockSupabase(vi.fn(() => chain));

    expect(await countApplicationsByStatus(supabase, "p1", "accepted")).toBe(3);
  });
});
