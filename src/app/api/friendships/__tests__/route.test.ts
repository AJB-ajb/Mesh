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

// Import *after* mocking so the mock takes effect
import { GET, POST } from "../route";

const MOCK_USER = { id: "user-1", email: "a@b.com" };

/** Helper: build a chainable Supabase query mock */
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
  // Terminal methods resolve to finalValue
  self.single = vi.fn(() => Promise.resolve(finalValue));
  self.maybeSingle = vi.fn(() => Promise.resolve(finalValue));
  // Non-terminal methods that can also be terminal (select after insert)
  // Wrap the proxy so the last call in the chain returns the data
  self.then = (resolve: (v: unknown) => void) => resolve(finalValue);
  return self;
}

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

function makeReq(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init);
}

const routeCtx = { params: Promise.resolve({}) };

describe("GET /api/friendships", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await GET(makeReq("/api/friendships"), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns friendships for the authenticated user", async () => {
    authedUser();
    const friendships = [
      { id: "f1", user_id: "user-1", friend_id: "user-2", status: "accepted" },
    ];
    const q = chain({ data: friendships, error: null });
    mockFrom.mockReturnValue(q);

    const res = await GET(makeReq("/api/friendships"), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.friendships).toEqual(friendships);
    expect(mockFrom).toHaveBeenCalledWith("friendships");
  });

  it("returns 500 on supabase error", async () => {
    authedUser();
    const q = chain({ data: null, error: null });
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

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await POST(
      makeReq("/api/friendships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friend_id: "user-2" }),
      }),
      routeCtx,
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when friend_id is missing", async () => {
    authedUser();
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
    authedUser();
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
    authedUser();

    // First call: check existing → found
    const existingQ = chain({
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
    authedUser();

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
        return chain({ data: null, error: null });
      }
      return chain({ data: newFriendship, error: null });
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
    authedUser();
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
