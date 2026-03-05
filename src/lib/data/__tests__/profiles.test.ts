import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getProfile,
  getProfileTimezone,
  batchGetProfiles,
  updateProfileFields,
} from "../profiles";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockSupabase(fromImpl: ReturnType<typeof vi.fn>) {
  return { from: fromImpl } as unknown as SupabaseClient;
}

function chainBuilder(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getProfile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns profile when found", async () => {
    const profile = { user_id: "u1", full_name: "Alice" };
    const chain = chainBuilder({ data: profile, error: null });
    const supabase = mockSupabase(vi.fn(() => chain));

    const result = await getProfile(supabase, "u1");
    expect(result).toEqual(profile);
  });

  it("returns null when no profile (PGRST116)", async () => {
    const chain = chainBuilder({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });
    const supabase = mockSupabase(vi.fn(() => chain));

    const result = await getProfile(supabase, "u-missing");
    expect(result).toBeNull();
  });

  it("throws on unexpected error", async () => {
    const chain = chainBuilder({
      data: null,
      error: { code: "42P01", message: "Relation not found" },
    });
    const supabase = mockSupabase(vi.fn(() => chain));

    await expect(getProfile(supabase, "u1")).rejects.toMatchObject({
      code: "42P01",
    });
  });
});

describe("getProfileTimezone", () => {
  it("returns the timezone", async () => {
    const chain = chainBuilder({
      data: { timezone: "Europe/Berlin" },
      error: null,
    });
    const supabase = mockSupabase(vi.fn(() => chain));

    expect(await getProfileTimezone(supabase, "u1")).toBe("Europe/Berlin");
  });

  it("defaults to UTC when timezone is null", async () => {
    const chain = chainBuilder({ data: { timezone: null }, error: null });
    const supabase = mockSupabase(vi.fn(() => chain));

    expect(await getProfileTimezone(supabase, "u1")).toBe("UTC");
  });
});

describe("batchGetProfiles", () => {
  it("returns empty array for empty input", async () => {
    const supabase = mockSupabase(vi.fn());
    const result = await batchGetProfiles(supabase, []);
    expect(result).toEqual([]);
  });

  it("fetches profiles by IDs", async () => {
    const profiles = [
      { user_id: "u1", full_name: "Alice" },
      { user_id: "u2", full_name: "Bob" },
    ];
    const chain = chainBuilder({ data: profiles, error: null });
    const supabase = mockSupabase(vi.fn(() => chain));

    const result = await batchGetProfiles(supabase, ["u1", "u2"]);
    expect(result).toEqual(profiles);
  });
});

describe("updateProfileFields", () => {
  it("updates fields without error", async () => {
    const chain = chainBuilder({ data: null, error: null });
    const supabase = mockSupabase(vi.fn(() => chain));

    await expect(
      updateProfileFields(supabase, "u1", { full_name: "New Name" }),
    ).resolves.toBeUndefined();
  });

  it("throws on error", async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({
        error: { code: "42000", message: "Update failed" },
      }),
    };
    const supabase = mockSupabase(vi.fn(() => chain));

    await expect(
      updateProfileFields(supabase, "u1", { full_name: "X" }),
    ).rejects.toMatchObject({ code: "42000" });
  });
});
