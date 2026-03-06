// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain } from "tests/utils/supabase-mock";
import {
  getNotificationsForUser,
  markNotificationsRead,
  createNotification,
} from "../notifications";

import type { SupabaseClient } from "@supabase/supabase-js";

function createMockSupabase(
  fromImpl: (table: string) => ReturnType<typeof buildChain>,
) {
  return { from: vi.fn(fromImpl) } as unknown as SupabaseClient;
}

describe("getNotificationsForUser", () => {
  it("returns notifications with default options", async () => {
    const notifications = [{ id: "n-1", title: "Hello" }];
    const chain = buildChain({ data: notifications, error: null });
    const supabase = createMockSupabase(() => chain);

    const result = await getNotificationsForUser(supabase, "user-1");

    expect(result).toEqual(notifications);
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(chain.limit).toHaveBeenCalledWith(20);
  });

  it("applies limit option", async () => {
    const chain = buildChain({ data: [], error: null });
    const supabase = createMockSupabase(() => chain);

    await getNotificationsForUser(supabase, "user-1", { limit: 5 });

    expect(chain.limit).toHaveBeenCalledWith(5);
  });

  it("applies unreadOnly filter", async () => {
    const chain = buildChain({ data: [], error: null });
    const supabase = createMockSupabase(() => chain);

    await getNotificationsForUser(supabase, "user-1", { unreadOnly: true });

    expect(chain.eq).toHaveBeenCalledWith("read", false);
  });

  it("returns empty array when data is null", async () => {
    const chain = buildChain({ data: null, error: null });
    const supabase = createMockSupabase(() => chain);

    const result = await getNotificationsForUser(supabase, "user-1");

    expect(result).toEqual([]);
  });

  it("throws on error", async () => {
    const chain = buildChain({ data: null, error: { message: "db error" } });
    const supabase = createMockSupabase(() => chain);

    await expect(getNotificationsForUser(supabase, "user-1")).rejects.toEqual({
      message: "db error",
    });
  });
});

describe("markNotificationsRead", () => {
  it("marks specific IDs", async () => {
    const chain = buildChain({ data: null, error: null });
    const supabase = createMockSupabase(() => chain);

    await markNotificationsRead(supabase, "user-1", ["n-1", "n-2"]);

    expect(chain.update).toHaveBeenCalledWith({ read: true });
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.in).toHaveBeenCalledWith("id", ["n-1", "n-2"]);
  });

  it("marks all unread when no IDs given", async () => {
    const chain = buildChain({ data: null, error: null });
    const supabase = createMockSupabase(() => chain);

    await markNotificationsRead(supabase, "user-1");

    expect(chain.update).toHaveBeenCalledWith({ read: true });
    expect(chain.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(chain.eq).toHaveBeenCalledWith("read", false);
    expect(chain.in).not.toHaveBeenCalled();
  });

  it("throws on error", async () => {
    const chain = buildChain({
      data: null,
      error: { message: "update failed" },
    });
    const supabase = createMockSupabase(() => chain);

    await expect(markNotificationsRead(supabase, "user-1")).rejects.toEqual({
      message: "update failed",
    });
  });
});

describe("createNotification", () => {
  it("inserts payload", async () => {
    const chain = buildChain({ data: null, error: null });
    const supabase = createMockSupabase(() => chain);

    const payload = {
      user_id: "user-1",
      type: "match_accepted",
      title: "Match accepted",
      body: "Your match was accepted",
    };

    await createNotification(supabase, payload);

    expect(chain.insert).toHaveBeenCalledWith(payload);
  });

  it("throws on error", async () => {
    const chain = buildChain({
      data: null,
      error: { message: "insert failed" },
    });
    const supabase = createMockSupabase(() => chain);

    await expect(
      createNotification(supabase, {
        user_id: "user-1",
        type: "test",
        title: "Test",
      }),
    ).rejects.toEqual({ message: "insert failed" });
  });
});
