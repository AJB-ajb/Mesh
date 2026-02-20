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

import { GET, POST } from "../route";

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

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

function makeReq(url: string, init?: RequestInit) {
  return new Request(`http://localhost${url}`, init);
}

const routeCtx = { params: Promise.resolve({}) };

describe("GET /api/friend-ask", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await GET(makeReq("/api/friend-ask"), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns friend-asks for the authenticated user", async () => {
    authedUser();
    const friendAsks = [
      { id: "fa1", creator_id: "user-1", posting_id: "p1", status: "pending" },
    ];
    const q = chain({ data: friendAsks, error: null });
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
    authedUser();
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
    authedUser();
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

  it("returns 404 when posting not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({ data: null, error: { message: "not found" } }),
    );

    const res = await POST(
      makeReq("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posting_id: "nope",
          ordered_friend_list: ["u2"],
        }),
      }),
      routeCtx,
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when posting belongs to another user", async () => {
    authedUser();
    const posting = { id: "p1", creator_id: "other-user", mode: "open" };
    mockFrom.mockReturnValue(chain({ data: posting, error: null }));

    const res = await POST(
      makeReq("/api/friend-ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posting_id: "p1", ordered_friend_list: ["u2"] }),
      }),
      routeCtx,
    );
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 409 when active friend-ask already exists", async () => {
    authedUser();
    const posting = { id: "p1", creator_id: "user-1", mode: "friend_ask" };
    const existingFA = { id: "fa-existing" };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chain({ data: posting, error: null }); // posting check
      if (callCount === 2) return chain({ data: existingFA, error: null }); // existing check
      return chain({ data: null, error: null });
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
    authedUser();
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
      if (callCount === 1) return chain({ data: posting, error: null }); // posting check
      if (callCount === 2) return chain({ data: null, error: null }); // existing check → not found
      return chain({ data: newFA, error: null }); // insert
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
});
