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

import { buildChain, authedUser } from "tests/utils/supabase-mock";
import { testRequiresAuth, testRequiresResource, testRequiresOwnership } from "tests/utils/route-test-helpers";

import { GET, POST } from "../route";

function makeReq(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init);
}

const routeCtx = { params: Promise.resolve({}) };

describe("GET /api/friend-ask", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresAuth(GET, () => makeReq("/api/friend-ask"), routeCtx, mockGetUser);

  it("returns friend-asks for the authenticated user", async () => {
    authedUser(mockGetUser);
    const friendAsks = [
      { id: "fa1", creator_id: "user-1", posting_id: "p1", status: "pending" },
    ];
    const q = buildChain({ data: friendAsks, error: null });
    mockFrom.mockReturnValue(q);

    const res = await GET(makeReq("/api/friend-ask"), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.friend_asks).toEqual(friendAsks);
  });
});

describe("POST /api/friend-ask", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when posting_id is missing", async () => {
    authedUser(mockGetUser);
    const res = await POST(
      makeReq("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordered_friend_list: ["u2"] }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 400 when ordered_friend_list is empty", async () => {
    authedUser(mockGetUser);
    const res = await POST(
      makeReq("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posting_id: "p1", ordered_friend_list: [] }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  testRequiresResource(POST, () => makeReq("/api/friend-ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ posting_id: "nope", ordered_friend_list: ["u2"] }),
  }), routeCtx, mockGetUser, mockFrom);

  testRequiresOwnership(POST, () => makeReq("/api/friend-ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ posting_id: "p1", ordered_friend_list: ["u2"] }),
  }), routeCtx, mockGetUser, () => {
    mockFrom.mockReturnValue(buildChain({ data: { id: "p1", creator_id: "other-user", mode: "open" }, error: null }));
  });

  it("returns 409 when active friend-ask already exists", async () => {
    authedUser(mockGetUser);
    const posting = { id: "p1", creator_id: "user-1", mode: "friend_ask" };
    const existingFA = { id: "fa-existing" };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain({ data: posting, error: null }); // posting check
      if (callCount === 2) return buildChain({ data: existingFA, error: null }); // existing check
      return buildChain({ data: null, error: null });
    });

    const res = await POST(
      makeReq("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posting_id: "p1", ordered_friend_list: ["u2"] }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("creates a friend-ask on success", async () => {
    authedUser(mockGetUser);
    const posting = { id: "p1", creator_id: "user-1" };
    const newFA = {
      id: "fa-new",
      posting_id: "p1",
      creator_id: "user-1",
      ordered_friend_list: ["u2", "u3"],
      current_request_index: 0,
      status: "pending",
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain({ data: posting, error: null }); // posting check
      if (callCount === 2) return buildChain({ data: null, error: null }); // existing check → not found
      return buildChain({ data: newFA, error: null }); // insert
    });

    const res = await POST(
      makeReq("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting_id: "p1",
          ordered_friend_list: ["u2", "u3"],
        }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.friend_ask.ordered_friend_list).toEqual(["u2", "u3"]);
  });

  it("creates a friend-ask with concurrent_invites: 3", async () => {
    authedUser(mockGetUser);
    const posting = { id: "p1", creator_id: "user-1" };
    const newFA = {
      id: "fa-new",
      posting_id: "p1",
      creator_id: "user-1",
      ordered_friend_list: ["u2", "u3", "u4", "u5"],
      current_request_index: 0,
      concurrent_invites: 3,
      status: "pending",
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain({ data: posting, error: null });
      if (callCount === 2) return buildChain({ data: null, error: null });
      return buildChain({ data: newFA, error: null });
    });

    const res = await POST(
      makeReq("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting_id: "p1",
          ordered_friend_list: ["u2", "u3", "u4", "u5"],
          concurrent_invites: 3,
        }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.friend_ask.concurrent_invites).toBe(3);
  });

  it("returns 400 when concurrent_invites exceeds list length", async () => {
    authedUser(mockGetUser);
    const res = await POST(
      makeReq("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting_id: "p1",
          ordered_friend_list: ["u2", "u3"],
          concurrent_invites: 5,
        }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 400 when concurrent_invites is 0", async () => {
    authedUser(mockGetUser);
    const res = await POST(
      makeReq("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting_id: "p1",
          ordered_friend_list: ["u2", "u3"],
          concurrent_invites: 0,
        }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });
});
