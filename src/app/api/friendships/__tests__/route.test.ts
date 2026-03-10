// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain, authedUser } from "tests/utils/supabase-mock";
import { testRequiresAuth } from "tests/utils/route-test-helpers";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Import *after* mocking so the mock takes effect
import { GET, POST } from "../route";

function makeReq(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init);
}

const routeCtx = { params: Promise.resolve({}) };

describe("GET /api/friendships", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresAuth(GET, () => makeReq("/api/friendships"), routeCtx, mockGetUser);

  it("returns friendships for the authenticated user", async () => {
    authedUser(mockGetUser);
    const friendships = [
      { id: "f1", user_id: "user-1", friend_id: "user-2", status: "accepted" },
    ];
    const q = buildChain({ data: friendships, error: null });
    mockFrom.mockReturnValue(q);

    const res = await GET(makeReq("/api/friendships"), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.friendships).toEqual(friendships);
    expect(mockFrom).toHaveBeenCalledWith("friendships");
  });

  it("returns 500 on supabase error", async () => {
    authedUser(mockGetUser);
    const q = buildChain({ data: null, error: null });
    // Override the implicit thenable with an error
    q.then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: { message: "DB down" } });
    mockFrom.mockReturnValue(q);

    const res = await GET(makeReq("/api/friendships"), routeCtx);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/friendships", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresAuth(POST, () => makeReq("/api/friendships", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ friend_id: "user-2" }),
  }), routeCtx, mockGetUser);

  it("returns 400 when friend_id is missing", async () => {
    authedUser(mockGetUser);
    const res = await POST(
      makeReq("/api/friendships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 400 when sending request to self", async () => {
    authedUser(mockGetUser);
    const res = await POST(
      makeReq("/api/friendships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_id: "user-1" }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.message).toContain("yourself");
  });

  it("returns 409 when friendship already exists", async () => {
    authedUser(mockGetUser);

    // First call: check existing → found
    const existingQ = buildChain({
      data: { id: "existing-1", status: "pending" },
      error: null,
    });
    // Second call would be insert, but we won't reach it
    mockFrom.mockReturnValue(existingQ);

    const res = await POST(
      makeReq("/api/friendships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_id: "user-2" }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("creates a friendship request on success", async () => {
    authedUser(mockGetUser);

    const newFriendship = {
      id: "f-new",
      user_id: "user-1",
      friend_id: "user-2",
      status: "pending",
    };

    // First call (check existing) → not found, second call (insert) → success
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildChain({ data: null, error: null });
      }
      return buildChain({ data: newFriendship, error: null });
    });

    const res = await POST(
      makeReq("/api/friendships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_id: "user-2" }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.friendship).toEqual(newFriendship);
  });

  it("returns 400 for invalid JSON body", async () => {
    authedUser(mockGetUser);
    const res = await POST(
      makeReq("/api/friendships", {
        method: "POST",
        body: "not json",
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });
});
