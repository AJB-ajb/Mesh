// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain } from "tests/utils/supabase-mock";
import { getMatch, getMatchesForUser, updateMatchStatus } from "../matches";

import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(
  fromImpl: (table: string) => ReturnType<typeof buildChain>,
) {
  return { from: vi.fn(fromImpl) } as unknown as SupabaseClient;
}

describe("getMatch", () => {
  it("returns data with joins on success", async () => {
    const matchData = {
      id: "m-1",
      status: "pending",
      postings: { title: "Project" },
    };
    const chain = buildChain({ data: matchData, error: null });
    const supabase = createMockSupabase(() => chain);

    const result = await getMatch(supabase, "m-1");

    expect(result).toEqual(matchData);
    expect(chain.select).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "m-1");
    expect(chain.single).toHaveBeenCalled();
  });

  it("returns null when PGRST116 error", async () => {
    const chain = buildChain({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });
    const supabase = createMockSupabase(() => chain);

    const result = await getMatch(supabase, "m-1");

    expect(result).toBeNull();
  });

  it("throws on other errors", async () => {
    const chain = buildChain({
      data: null,
      error: { code: "42P01", message: "table missing" },
    });
    const supabase = createMockSupabase(() => chain);

    await expect(getMatch(supabase, "m-1")).rejects.toEqual({
      code: "42P01",
      message: "table missing",
    });
  });
});

describe("getMatchesForUser", () => {
  it("returns array of matches", async () => {
    const matches = [{ id: "m-1" }, { id: "m-2" }];
    const chain = buildChain({ data: matches, error: null });
    const supabase = createMockSupabase(() => chain);

    const result = await getMatchesForUser(supabase, "user-1");

    expect(result).toEqual(matches);
    expect(chain.or).toHaveBeenCalled();
    expect(chain.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
  });

  it("returns empty array when data is null", async () => {
    const chain = buildChain({ data: null, error: null });
    const supabase = createMockSupabase(() => chain);

    const result = await getMatchesForUser(supabase, "user-1");

    expect(result).toEqual([]);
  });

  it("throws on error", async () => {
    const chain = buildChain({ data: null, error: { message: "db error" } });
    const supabase = createMockSupabase(() => chain);

    await expect(getMatchesForUser(supabase, "user-1")).rejects.toEqual({
      message: "db error",
    });
  });
});

describe("updateMatchStatus", () => {
  it("calls update with status and extra fields", async () => {
    const chain = buildChain({ data: null, error: null });
    const supabase = createMockSupabase(() => chain);

    await updateMatchStatus(supabase, "m-1", "accepted", { notes: "good fit" });

    expect(chain.update).toHaveBeenCalledWith({
      status: "accepted",
      notes: "good fit",
    });
    expect(chain.eq).toHaveBeenCalledWith("id", "m-1");
  });

  it("throws on error", async () => {
    const chain = buildChain({
      data: null,
      error: { message: "update failed" },
    });
    const supabase = createMockSupabase(() => chain);

    await expect(
      updateMatchStatus(supabase, "m-1", "accepted"),
    ).rejects.toEqual({ message: "update failed" });
  });
});
