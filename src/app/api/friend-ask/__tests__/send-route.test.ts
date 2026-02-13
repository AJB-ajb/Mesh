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

import { POST } from "../[id]/send/route";

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

const routeCtx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/friend-ask/[id]/send", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when friend-ask not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({ data: null, error: { message: "not found" } }),
    );

    const res = await POST(
      makeReq("/api/friend-ask/nope/send", { method: "POST" }),
      routeCtx("nope"),
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when non-creator tries to send", async () => {
    authedUser();
    const fa = {
      id: "fa1",
      creator_id: "other-user",
      ordered_friend_list: ["u2", "u3"],
      current_request_index: 0,
      status: "pending",
    };
    mockFrom.mockReturnValue(chain({ data: fa, error: null }));

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when friend-ask is not pending", async () => {
    authedUser();
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      ordered_friend_list: ["u2"],
      current_request_index: 0,
      status: "accepted",
    };
    mockFrom.mockReturnValue(chain({ data: fa, error: null }));

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    expect(res.status).toBe(400);
  });

  it("advances to next friend", async () => {
    authedUser();
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      ordered_friend_list: ["u2", "u3", "u4"],
      current_request_index: 0,
      status: "pending",
    };
    const updated = { ...fa, current_request_index: 1 };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chain({ data: fa, error: null });
      return chain({ data: updated, error: null });
    });

    const res = await POST(
      makeReq("/api/friend-ask/fa1/send", { method: "POST" }),
      routeCtx("fa1"),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.current_friend_id).toBe("u3");
  });

  it("marks as completed when list exhausted", async () => {
    authedUser();
    const fa = {
      id: "fa1",
      creator_id: "user-1",
      ordered_friend_list: ["u2"],
      current_request_index: 0,
      status: "pending",
    };
    const updated = { ...fa, status: "completed" };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return chain({ data: fa, error: null });
      return chain({ data: updated, error: null });
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
});
