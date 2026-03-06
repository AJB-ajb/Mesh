// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain, buildCountChain } from "tests/utils/supabase-mock";
import { markPostingFilledIfFull } from "../posting-fulfillment";

import type { SupabaseClient } from "@supabase/supabase-js";

describe("markPostingFilledIfFull", () => {
  let mockFrom: ReturnType<typeof vi.fn>;
  let supabase: SupabaseClient;

  function setupSupabase(opts: {
    posting: { team_size_max: number | null } | null;
    count: number | null;
  }) {
    const postingChain = buildChain({
      data: opts.posting,
      error: null,
    });
    const countChain =
      opts.count !== null
        ? buildCountChain(opts.count)
        : buildChain({ data: null, error: null, count: null });
    const updateChain = buildChain({ data: null, error: null });

    mockFrom = vi.fn((table: string) => {
      if (table === "postings") {
        // First call is select, subsequent calls may be update
        // We track via call count
        if (
          mockFrom.mock.calls.filter((c: string[]) => c[0] === "postings")
            .length > 1
        ) {
          return updateChain;
        }
        return postingChain;
      }
      return countChain;
    });

    supabase = { from: mockFrom } as unknown as SupabaseClient;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks posting as filled when accepted count reaches team_size_max", async () => {
    const postingChain = buildChain({
      data: { team_size_max: 3 },
      error: null,
    });
    const countChain = buildCountChain(3);
    const updateChain = buildChain({ data: null, error: null });

    let postingCallCount = 0;
    mockFrom = vi.fn((table: string) => {
      if (table === "postings") {
        postingCallCount++;
        return postingCallCount === 1 ? postingChain : updateChain;
      }
      return countChain;
    });
    supabase = { from: mockFrom } as unknown as SupabaseClient;

    await markPostingFilledIfFull(
      supabase,
      "p-1",
      "applications",
      "posting_id",
    );

    expect(mockFrom).toHaveBeenCalledWith("postings");
    expect(mockFrom).toHaveBeenCalledWith("applications");
    // Should have called update (3rd from call to "postings")
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "filled" }),
    );
  });

  it("does NOT update when count is below team_size_max", async () => {
    const postingChain = buildChain({
      data: { team_size_max: 3 },
      error: null,
    });
    const countChain = buildCountChain(2);
    const updateChain = buildChain({ data: null, error: null });

    mockFrom = vi.fn((table: string) => {
      if (table === "postings") return postingChain;
      return countChain;
    });
    supabase = { from: mockFrom } as unknown as SupabaseClient;

    await markPostingFilledIfFull(
      supabase,
      "p-1",
      "applications",
      "posting_id",
    );

    expect(updateChain.update).not.toHaveBeenCalled();
  });

  it("defaults team_size_max to 1 when null", async () => {
    const postingChain = buildChain({
      data: { team_size_max: null },
      error: null,
    });
    const countChain = buildCountChain(1);
    const updateChain = buildChain({ data: null, error: null });

    let postingCallCount = 0;
    mockFrom = vi.fn((table: string) => {
      if (table === "postings") {
        postingCallCount++;
        return postingCallCount === 1 ? postingChain : updateChain;
      }
      return countChain;
    });
    supabase = { from: mockFrom } as unknown as SupabaseClient;

    await markPostingFilledIfFull(supabase, "p-1", "matches", "posting_id");

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "filled" }),
    );
  });

  it("returns gracefully when posting not found", async () => {
    const postingChain = buildChain({
      data: null,
      error: null,
    });

    mockFrom = vi.fn(() => postingChain);
    supabase = { from: mockFrom } as unknown as SupabaseClient;

    await expect(
      markPostingFilledIfFull(supabase, "p-1", "applications", "posting_id"),
    ).resolves.toBeUndefined();

    // Should only have called from("postings") once for the select
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("does not update when count is null", async () => {
    const postingChain = buildChain({
      data: { team_size_max: 3 },
      error: null,
    });
    const countChain = buildChain({ data: null, error: null, count: null });
    const updateChain = buildChain({ data: null, error: null });

    mockFrom = vi.fn((table: string) => {
      if (table === "postings") return postingChain;
      return countChain;
    });
    supabase = { from: mockFrom } as unknown as SupabaseClient;

    await markPostingFilledIfFull(
      supabase,
      "p-1",
      "applications",
      "posting_id",
    );

    expect(updateChain.update).not.toHaveBeenCalled();
  });
});
