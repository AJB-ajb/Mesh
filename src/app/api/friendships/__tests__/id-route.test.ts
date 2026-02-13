// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { PATCH, DELETE } from "../[id]/route";

const MOCK_USER = { id: "user-1", email: "a@b.com" };
const FRIEND_ID = "user-2";

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

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

function makeReq(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init);
}

const routeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/friendships/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await PATCH(
      makeReq("/api/friendships/f1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      }),
      routeCtx("f1"),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status", async () => {
    authedUser();
    const res = await PATCH(
      makeReq("/api/friendships/f1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invalid" }),
      }),
      routeCtx("f1"),
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 404 when friendship not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({ data: null, error: { message: "not found" } }),
    );

    const res = await PATCH(
      makeReq("/api/friendships/no-exist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      }),
      routeCtx("no-exist"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-recipient tries to accept", async () => {
    authedUser();
    // user-1 is the initiator (user_id), not the recipient (friend_id)
    const friendship = {
      id: "f1",
      user_id: "user-1",
      friend_id: FRIEND_ID,
      status: "pending",
    };
    mockFrom.mockReturnValue(chain({ data: friendship, error: null }));

    const res = await PATCH(
      makeReq("/api/friendships/f1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      }),
      routeCtx("f1"),
    );
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows the recipient to accept", async () => {
    authedUser();
    // user-1 is the recipient (friend_id)
    const friendship = {
      id: "f1",
      user_id: FRIEND_ID,
      friend_id: "user-1",
      status: "pending",
    };
    const updated = { ...friendship, status: "accepted" };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chain({ data: friendship, error: null });
      return chain({ data: updated, error: null });
    });

    const res = await PATCH(
      makeReq("/api/friendships/f1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      }),
      routeCtx("f1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.friendship.status).toBe("accepted");
  });
});

describe("DELETE /api/friendships/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when friendship not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({ data: null, error: { message: "not found" } }),
    );

    const res = await DELETE(
      makeReq("/api/friendships/nope", { method: "DELETE" }),
      routeCtx("nope"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-initiator tries to delete", async () => {
    authedUser();
    // user-1 is the recipient, not the initiator
    mockFrom.mockReturnValue(
      chain({ data: { user_id: FRIEND_ID }, error: null }),
    );

    const res = await DELETE(
      makeReq("/api/friendships/f1", { method: "DELETE" }),
      routeCtx("f1"),
    );
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("deletes friendship when initiator requests", async () => {
    authedUser();

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // fetch check
        return chain({ data: { user_id: "user-1" }, error: null });
      }
      // delete call
      const q = chain({ data: null, error: null });
      q.then = (resolve: (v: unknown) => void) =>
        resolve({ data: null, error: null });
      return q;
    });

    const res = await DELETE(
      makeReq("/api/friendships/f1", { method: "DELETE" }),
      routeCtx("f1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
