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

import { POST } from "../[id]/respond/route";

const MOCK_USER = { id: "user-1", email: "a@b.com" };

function chain(finalValue: { data: unknown; error: unknown }) {
  const self: Record<string, unknown> = {};
  const methods = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "or",
    "in",
    "limit",
    "order",
    "single",
    "maybeSingle",
  ];
  for (const m of methods) {
    self[m] = vi.fn(() => self);
  }
  self.single = vi.fn(() => Promise.resolve(finalValue));
  self.maybeSingle = vi.fn(() => Promise.resolve(finalValue));
  self.then = (resolve: (v: unknown) => void) => resolve(finalValue);
  return self;
}

/** Chain that records inserted data for later assertions */
function trackingChain(insertLog: unknown[]) {
  const self: Record<string, unknown> = {};
  const methods = [
    "select",
    "update",
    "delete",
    "eq",
    "or",
    "in",
    "limit",
    "order",
    "single",
    "maybeSingle",
  ];
  for (const m of methods) {
    self[m] = vi.fn(() => self);
  }
  self.insert = vi.fn((data: unknown) => {
    insertLog.push(data);
    return self;
  });
  self.single = vi.fn(() => Promise.resolve({ data: null, error: null }));
  self.maybeSingle = vi.fn(() => Promise.resolve({ data: null, error: null }));
  self.then = (resolve: (v: unknown) => void) =>
    resolve({ data: null, error: null });
  return self;
}

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

function makeReq(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init);
}

const routeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/friend-ask/[id]/respond", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 for invalid action", async () => {
    authedUser();
    const res = await POST(
      makeReq("/api/friend-ask/fa1/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "maybe" }),
      }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 404 when friend-ask not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({ data: null, error: { message: "not found" } }),
    );

    const res = await POST(
      makeReq("/api/friend-ask/nope/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      }),
      routeCtx("nope"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not in pending_invitees", async () => {
    authedUser();
    const fa = {
      id: "fa1",
      creator_id: "creator",
      posting_id: "p1",
      ordered_friend_list: ["other-user", "user-1"],
      current_request_index: 1,
      pending_invitees: ["other-user"], // user-1 is NOT in pending_invitees
      declined_list: [],
      concurrent_invites: 1,
      status: "pending",
    };
    mockFrom.mockReturnValue(chain({ data: fa, error: null }));

    const res = await POST(
      makeReq("/api/friend-ask/fa1/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("accepts the friend-ask and notifies creator", async () => {
    authedUser();
    const fa = {
      id: "fa1",
      creator_id: "creator",
      posting_id: "p1",
      ordered_friend_list: ["user-1", "u2"],
      current_request_index: 1,
      pending_invitees: ["user-1"],
      declined_list: [],
      concurrent_invites: 1,
      status: "pending",
    };
    const updated = { ...fa, status: "accepted", pending_invitees: [] };

    const notificationInserts: unknown[] = [];
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "notifications") {
        return trackingChain(notificationInserts);
      }
      if (callCount === 1) return chain({ data: fa, error: null });
      return chain({ data: updated, error: null });
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.friend_ask.status).toBe("accepted");

    // Creator should be notified
    const creatorNotif = notificationInserts.find(
      (n: unknown) =>
        (n as Record<string, unknown>).user_id === "creator" &&
        (n as Record<string, string>).title === "Invite Accepted!",
    );
    expect(creatorNotif).toBeTruthy();
  });

  it("declines, notifies creator, and auto-sends to next friend (backfill)", async () => {
    authedUser();
    const fa = {
      id: "fa1",
      creator_id: "creator",
      posting_id: "p1",
      ordered_friend_list: ["user-1", "u2", "u3"],
      current_request_index: 1,
      pending_invitees: ["user-1"],
      declined_list: [],
      concurrent_invites: 1,
      status: "pending",
    };
    const updated = {
      ...fa,
      pending_invitees: ["u2"],
      declined_list: ["user-1"],
      current_request_index: 2,
    };

    const notificationInserts: unknown[] = [];
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "notifications") {
        return trackingChain(notificationInserts);
      }
      if (callCount === 1) return chain({ data: fa, error: null });
      return chain({ data: updated, error: null });
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.next_friend_id).toBe("u2");
    expect(body.message).toContain("Next connection");

    // Creator should be notified about decline
    const declineNotif = notificationInserts.find(
      (n: unknown) =>
        (n as Record<string, unknown>).user_id === "creator" &&
        (n as Record<string, string>).title === "Invite Declined",
    );
    expect(declineNotif).toBeTruthy();

    // Next friend should receive invite notification
    const nextFriendNotif = notificationInserts.find(
      (n: unknown) =>
        (n as Record<string, unknown>).user_id === "u2" &&
        (n as Record<string, string>).type === "sequential_invite",
    );
    expect(nextFriendNotif).toBeTruthy();
  });

  it("declines and completes when last friend in list", async () => {
    authedUser();
    const fa = {
      id: "fa1",
      creator_id: "creator",
      posting_id: "p1",
      ordered_friend_list: ["user-1"],
      current_request_index: 1,
      pending_invitees: ["user-1"],
      declined_list: [],
      concurrent_invites: 1,
      status: "pending",
    };
    const updated = {
      ...fa,
      status: "completed",
      pending_invitees: [],
      declined_list: ["user-1"],
    };

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "notifications") {
        return trackingChain([]);
      }
      if (callCount === 1) return chain({ data: fa, error: null });
      return chain({ data: updated, error: null });
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.friend_ask.status).toBe("completed");
    expect(body.message).toContain("completed");
  });

  it("returns 400 when friend-ask is not pending", async () => {
    authedUser();
    const fa = {
      id: "fa1",
      creator_id: "creator",
      posting_id: "p1",
      ordered_friend_list: ["user-1"],
      current_request_index: 1,
      pending_invitees: ["user-1"],
      declined_list: [],
      concurrent_invites: 1,
      status: "accepted",
    };
    mockFrom.mockReturnValue(chain({ data: fa, error: null }));

    const res = await POST(
      makeReq("/api/friend-ask/fa1/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      }),
      routeCtx("fa1"),
    );
    expect(res.status).toBe(400);
  });

  it("decline triggers backfill from remaining list", async () => {
    authedUser();
    // concurrent_invites=2, two people pending, user-1 declines, u4 should be backfilled
    const fa = {
      id: "fa1",
      creator_id: "creator",
      posting_id: "p1",
      ordered_friend_list: ["user-1", "u2", "u3", "u4", "u5"],
      current_request_index: 3,
      pending_invitees: ["user-1", "u2"],
      declined_list: ["u3"], // u3 already declined earlier
      concurrent_invites: 2,
      status: "pending",
    };
    const updated = {
      ...fa,
      pending_invitees: ["u2", "u4"],
      declined_list: ["u3", "user-1"],
      current_request_index: 4,
    };

    const notificationInserts: unknown[] = [];
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "notifications") {
        return trackingChain(notificationInserts);
      }
      if (callCount === 1) return chain({ data: fa, error: null });
      return chain({ data: updated, error: null });
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.next_friend_id).toBe("u4");

    // Backfill candidate (u4) should receive invite notification
    const backfillNotif = notificationInserts.find(
      (n: unknown) =>
        (n as Record<string, unknown>).user_id === "u4" &&
        (n as Record<string, string>).type === "sequential_invite",
    );
    expect(backfillNotif).toBeTruthy();
  });

  it("accept with multiple pending clears all pending_invitees", async () => {
    authedUser();
    const fa = {
      id: "fa1",
      creator_id: "creator",
      posting_id: "p1",
      ordered_friend_list: ["user-1", "u2", "u3"],
      current_request_index: 3,
      pending_invitees: ["user-1", "u2"],
      declined_list: [],
      concurrent_invites: 2,
      status: "pending",
    };
    const updated = { ...fa, status: "accepted", pending_invitees: [] };

    const notificationInserts: unknown[] = [];
    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;
      if (table === "notifications") {
        return trackingChain(notificationInserts);
      }
      if (callCount === 1) return chain({ data: fa, error: null });
      return chain({ data: updated, error: null });
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.friend_ask.status).toBe("accepted");
    expect(body.friend_ask.pending_invitees).toEqual([]);
  });
});
