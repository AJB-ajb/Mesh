// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { promoteFromWaitlist } from "@/lib/api/waitlist-promotion";

function buildChain(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue({ error: null });
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(resolveValue);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolveValue);
  return chain;
}

const basePosting = {
  title: "Test Posting",
  creator_id: "owner-1",
  status: "filled",
  auto_accept: false,
  team_size_max: 3,
};

describe("promoteFromWaitlist", () => {
  let mockFrom: ReturnType<typeof vi.fn>;
  let supabase: { from: typeof mockFrom };

  beforeEach(() => {
    mockFrom = vi.fn();
    supabase = { from: mockFrom };
  });

  it("reopens posting when no waitlisted users and posting is filled", async () => {
    const appChain = buildChain({ data: null, error: null });
    const postingChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return appChain;
      return postingChain;
    });

    await promoteFromWaitlist(supabase as never, "posting-1", basePosting);

    expect(postingChain.update).toHaveBeenCalledWith({ status: "open" });
  });

  it("does nothing when no waitlisted users and posting is not filled", async () => {
    const appChain = buildChain({ data: null, error: null });
    mockFrom.mockReturnValue(appChain);

    await promoteFromWaitlist(supabase as never, "posting-1", {
      ...basePosting,
      status: "open",
    });

    // Only one from() call (for applications), no update call
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("auto-accepts and notifies the promoted user when auto_accept is true", async () => {
    const appChain = buildChain({
      data: { id: "app-1", applicant_id: "user-2" },
      error: null,
    });
    const updateChain = buildChain({ data: null, error: null });
    const profileChain = buildChain({
      data: { notification_preferences: null },
      error: null,
    });
    const notifChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return appChain; // find waitlisted
      if (callCount === 2) return updateChain; // update application
      if (callCount === 3) return profileChain; // fetch promoted user prefs
      return notifChain; // insert notification
    });

    await promoteFromWaitlist(supabase as never, "posting-1", {
      ...basePosting,
      auto_accept: true,
    });

    expect(updateChain.update).toHaveBeenCalledWith({ status: "accepted" });
    expect(notifChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-2",
        type: "application_accepted",
      }),
    );
  });

  it("notifies owner when auto_accept is false", async () => {
    const appChain = buildChain({
      data: { id: "app-1", applicant_id: "user-2" },
      error: null,
    });
    const profileChain = buildChain({
      data: { notification_preferences: null },
      error: null,
    });
    const notifChain = buildChain({ data: null, error: null });
    const postingChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return appChain;
      if (callCount === 2) return profileChain;
      if (callCount === 3) return notifChain;
      return postingChain;
    });

    await promoteFromWaitlist(supabase as never, "posting-1", basePosting);

    expect(notifChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "owner-1",
        type: "application_received",
      }),
    );
  });

  it("respects notification preferences — skips notification when disabled", async () => {
    const appChain = buildChain({
      data: { id: "app-1", applicant_id: "user-2" },
      error: null,
    });
    const updateChain = buildChain({ data: null, error: null });
    const profileChain = buildChain({
      data: {
        notification_preferences: {
          in_app: { application_accepted: false },
          browser: {},
        },
      },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return appChain;
      if (callCount === 2) return updateChain;
      return profileChain;
    });

    await promoteFromWaitlist(supabase as never, "posting-1", {
      ...basePosting,
      auto_accept: true,
    });

    // Should only have 3 from() calls — no notification insert
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });
});
