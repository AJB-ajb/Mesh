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

const { PATCH } = await import("@/app/api/postings/[id]/extend-deadline/route");

function makeReq(body?: Record<string, unknown>) {
  return new Request(
    "http://localhost/api/postings/posting-1/extend-deadline",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    },
  );
}

const routeCtx = { params: Promise.resolve({ id: "posting-1" }) };

describe("PATCH /api/postings/[id]/extend-deadline", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await PATCH(makeReq({ days: 7 }), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when posting not found", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );

    const res = await PATCH(makeReq({ days: 7 }), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 403 when user is not the creator", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: {
          id: "posting-1",
          creator_id: "other-user",
          status: "expired",
          expires_at: new Date(Date.now() - 86400000).toISOString(),
        },
        error: null,
      }),
    );

    const res = await PATCH(makeReq({ days: 7 }), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when posting is not expired", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: {
          id: "posting-1",
          creator_id: "user-1",
          status: "open",
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
        },
        error: null,
      }),
    );

    const res = await PATCH(makeReq({ days: 7 }), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("extends deadline of an expired posting successfully", async () => {
    authedUser(mockGetUser);

    const expiredPosting = {
      id: "posting-1",
      creator_id: "user-1",
      status: "open",
      expires_at: new Date(Date.now() - 86400000).toISOString(),
    };
    const updatedPosting = {
      ...expiredPosting,
      status: "open",
      expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return buildChain({ data: expiredPosting, error: null });
      return buildChain({ data: updatedPosting, error: null });
    });

    const res = await PATCH(makeReq({ days: 14 }), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.posting).toBeDefined();
  });

  it("returns 500 when update fails", async () => {
    authedUser(mockGetUser);

    const expiredPosting = {
      id: "posting-1",
      creator_id: "user-1",
      status: "expired",
      expires_at: new Date(Date.now() - 86400000).toISOString(),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1)
        return buildChain({ data: expiredPosting, error: null });
      return buildChain({ data: null, error: { message: "update failed" } });
    });

    const res = await PATCH(makeReq({ days: 7 }), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
  });
});
