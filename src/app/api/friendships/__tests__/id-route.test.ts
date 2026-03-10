// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain, authedUser } from "tests/utils/supabase-mock";
import { testRequiresAuth, testRequiresResource, testRequiresOwnership } from "tests/utils/route-test-helpers";

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

const FRIEND_ID = "user-2";

function makeReq(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init);
}

const routeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/friendships/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresAuth(PATCH, () => makeReq("/api/friendships/f1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "accepted" }),
  }), routeCtx("f1"), mockGetUser);

  it("returns 400 for invalid status", async () => {
    authedUser(mockGetUser);
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

  testRequiresResource(PATCH, () => makeReq("/api/friendships/no-exist", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "accepted" }),
  }), routeCtx("no-exist"), mockGetUser, mockFrom);

  testRequiresOwnership(PATCH, () => makeReq("/api/friendships/f1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "accepted" }),
  }), routeCtx("f1"), mockGetUser, () => {
    mockFrom.mockReturnValue(buildChain({ data: {
      id: "f1",
      user_id: "user-1",
      friend_id: FRIEND_ID,
      status: "pending",
    }, error: null }));
  });

  it("allows the recipient to accept", async () => {
    authedUser(mockGetUser);
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
      if (callCount === 1) return buildChain({ data: friendship, error: null });
      return buildChain({ data: updated, error: null });
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

  testRequiresResource(DELETE, () => makeReq("/api/friendships/nope", { method: "DELETE" }), routeCtx("nope"), mockGetUser, mockFrom);

  testRequiresOwnership(DELETE, () => makeReq("/api/friendships/f1", { method: "DELETE" }), routeCtx("f1"), mockGetUser, () => {
    mockFrom.mockReturnValue(buildChain({ data: { user_id: FRIEND_ID }, error: null }));
  });

  it("deletes friendship when initiator requests", async () => {
    authedUser(mockGetUser);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // fetch check
        return buildChain({ data: { user_id: "user-1" }, error: null });
      }
      // delete call
      const q = buildChain({ data: null, error: null });
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
