// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { buildChain, authedUser, mockTables } from "tests/utils/supabase-mock";
import { testRequiresResource, testRequiresOwnership } from "tests/utils/route-test-helpers";

import { POST } from "../[id]/send/route";

function makeReq(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init);
}

const routeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/friend-ask/[id]/send", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresResource(POST, () => makeReq("/api/friend-ask/nope/send", { method: "POST" }), routeCtx("nope"), mockGetUser, mockFrom);

  testRequiresOwnership(POST, () => makeReq("/api/friend-ask/fa1/send", { method: "POST" }), routeCtx("fa1"), mockGetUser, () => {
    mockFrom.mockReturnValue(buildChain({ data: {
      id: "fa1",
      creator_id: "other-user",
      ordered_friend_list: ["u2", "u3"],
      current_request_index: 0,
      status: "pending",
    }, error: null }));
  });

  it("does not call supabase update when user gets 403", async () => {
    authedUser(mockGetUser);
    const fa = {
      id: "fa1",
      creator_id: "other-user",
      ordered_friend_list: ["u2", "u3"],
      current_request_index: 0,
      status: "pending",
    };
    mockFrom.mockReturnValue(buildChain({ data: fa, error: null }));

    await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    // Only one call to `from` — the initial fetch; no update should happen
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when friend-ask is not pending", async () => {
    authedUser(mockGetUser);
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      ordered_friend_list: ["u2"],
      current_request_index: 0,
      status: "accepted",
    };
    mockFrom.mockReturnValue(buildChain({ data: fa, error: null }));

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    expect(res.status).toBe(400);
  });

  it("sends invite to current friend (first in list) with concurrent_invites=1", async () => {
    authedUser(mockGetUser);
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      posting_id: "p1",
      ordered_friend_list: ["u2", "u3", "u4"],
      current_request_index: 0,
      concurrent_invites: 1,
      pending_invitees: [],
      declined_list: [],
      status: "pending",
    };
    const updated = {
      ...fa,
      pending_invitees: ["u2"],
      current_request_index: 1,
    };

    mockTables(mockFrom, {
      friend_asks: [
        buildChain({ data: fa, error: null }),
        buildChain({ data: updated, error: null }),
      ],
      profiles: [
        buildChain({ data: { full_name: "Sender" }, error: null }),
        buildChain({ data: { notification_preferences: null }, error: null }),
      ],
      postings: buildChain({ data: { title: "Test Posting" }, error: null }),
      notifications: buildChain({ data: null, error: null }),
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    // Should send to the FIRST friend (index 0)
    expect(body.notified).toEqual(["u2"]);
    expect(body.notified_count).toBe(1);
  });

  it("uses sequential_invite notification type", async () => {
    authedUser(mockGetUser);
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      posting_id: "p1",
      ordered_friend_list: ["u2"],
      current_request_index: 0,
      concurrent_invites: 1,
      pending_invitees: [],
      declined_list: [],
      status: "pending",
    };

    const insertChain = buildChain({ data: null, error: null });

    mockTables(mockFrom, {
      friend_asks: buildChain({ data: fa, error: null }),
      profiles: [
        buildChain({ data: { full_name: "Sender" }, error: null }),
        buildChain({ data: { notification_preferences: null }, error: null }),
      ],
      postings: buildChain({ data: { title: "Test Posting" }, error: null }),
      notifications: insertChain,
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    expect(res.status).toBe(200);
    expect(insertChain.insert).toHaveBeenCalled();
  });

  it("marks as completed when index is past list length", async () => {
    authedUser(mockGetUser);
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      posting_id: "p1",
      ordered_friend_list: ["u2"],
      current_request_index: 1, // past the end
      concurrent_invites: 1,
      pending_invitees: [],
      status: "pending",
    };
    const updated = { ...fa, status: "completed" };

    mockTables(mockFrom, {
      friend_asks: [
        buildChain({ data: fa, error: null }),
        buildChain({ data: updated, error: null }),
      ],
      profiles: buildChain({ data: { full_name: "Sender" }, error: null }),
      postings: buildChain({ data: { title: "Test Posting" }, error: null }),
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.friend_ask.status).toBe("completed");
    expect(body.message).toContain("completed");
  });

  it("sends invites to N people at once (concurrent_invites: 3)", async () => {
    authedUser(mockGetUser);
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      posting_id: "p1",
      ordered_friend_list: ["u2", "u3", "u4", "u5", "u6"],
      current_request_index: 0,
      concurrent_invites: 3,
      pending_invitees: [],
      declined_list: [],
      status: "pending",
    };
    const updated = {
      ...fa,
      pending_invitees: ["u2", "u3", "u4"],
      current_request_index: 3,
    };

    mockTables(mockFrom, {
      friend_asks: [
        buildChain({ data: fa, error: null }),
        buildChain({ data: updated, error: null }),
      ],
      profiles: [
        buildChain({ data: { full_name: "Sender" }, error: null }),
        buildChain({ data: { notification_preferences: null }, error: null }),
        buildChain({ data: { notification_preferences: null }, error: null }),
        buildChain({ data: { notification_preferences: null }, error: null }),
      ],
      postings: buildChain({ data: { title: "Test Posting" }, error: null }),
      notifications: buildChain({ data: null, error: null }),
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.notified).toEqual(["u2", "u3", "u4"]);
    expect(body.notified_count).toBe(3);
  });

  it("skips declined users when filling concurrent slots", async () => {
    authedUser(mockGetUser);
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      posting_id: "p1",
      ordered_friend_list: ["u2", "u3", "u4", "u5"],
      current_request_index: 0,
      concurrent_invites: 2,
      pending_invitees: [],
      declined_list: ["u2"], // u2 already declined
      status: "pending",
    };
    const updated = {
      ...fa,
      pending_invitees: ["u3", "u4"],
      current_request_index: 3,
    };

    mockTables(mockFrom, {
      friend_asks: [
        buildChain({ data: fa, error: null }),
        buildChain({ data: updated, error: null }),
      ],
      profiles: [
        buildChain({ data: { full_name: "Sender" }, error: null }),
        buildChain({ data: { notification_preferences: null }, error: null }),
        buildChain({ data: { notification_preferences: null }, error: null }),
      ],
      postings: buildChain({ data: { title: "Test Posting" }, error: null }),
      notifications: buildChain({ data: null, error: null }),
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    // u2 is skipped (declined), so u3 and u4 are notified
    expect(body.notified).toEqual(["u3", "u4"]);
    expect(body.notified_count).toBe(2);
  });

  it("gracefully handles profile lookup failure after friend-ask found", async () => {
    authedUser(mockGetUser);
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      posting_id: "p1",
      ordered_friend_list: ["u2"],
      current_request_index: 0,
      concurrent_invites: 1,
      pending_invitees: [],
      declined_list: [],
      status: "pending",
    };

    mockTables(mockFrom, {
      friend_asks: [
        buildChain({ data: fa, error: null }),
        buildChain({ data: fa, error: null }),
      ],
      profiles: buildChain({
        data: null,
        error: { message: "profiles error" },
      }),
      postings: buildChain({ data: { title: "Test Posting" }, error: null }),
      notifications: buildChain({ data: null, error: null }),
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    // Route continues with fallback "Someone" when profile fails, so still 200
    expect(res.status).toBe(200);
  });

  it("gracefully handles posting lookup failure after friend-ask found", async () => {
    authedUser(mockGetUser);
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      posting_id: "p1",
      ordered_friend_list: ["u2"],
      current_request_index: 0,
      concurrent_invites: 1,
      pending_invitees: [],
      declined_list: [],
      status: "pending",
    };

    mockTables(mockFrom, {
      friend_asks: [
        buildChain({ data: fa, error: null }),
        buildChain({ data: fa, error: null }),
      ],
      profiles: [
        buildChain({ data: { full_name: "Sender" }, error: null }),
        buildChain({ data: { notification_preferences: null }, error: null }),
      ],
      postings: buildChain({
        data: null,
        error: { message: "postings error" },
      }),
      notifications: buildChain({ data: null, error: null }),
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    // Route continues with fallback "a posting" when posting fails, so still 200
    expect(res.status).toBe(200);
  });
});
