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

const { POST } = await import("@/app/api/postings/[id]/repost/route");

/** Build a chain that resolves at .eq() (no .single()) — for delete ops */
function buildDeleteChain(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockResolvedValue(resolveValue);
  return chain;
}

function makeReq(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/postings/posting-1/repost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const routeCtx = { params: Promise.resolve({ id: "posting-1" }) };

describe("POST /api/postings/[id]/repost", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await POST(makeReq({ days: 7 }), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when posting not found", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );

    const res = await POST(makeReq({ days: 7 }), routeCtx);
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

    const res = await POST(makeReq({ days: 7 }), routeCtx);
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

    const res = await POST(makeReq({ days: 7 }), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("reposts an expired posting successfully", async () => {
    authedUser(mockGetUser);

    const expiredPosting = {
      id: "posting-1",
      creator_id: "user-1",
      status: "expired",
      expires_at: new Date(Date.now() - 86400000).toISOString(),
    };
    const updatedPosting = {
      ...expiredPosting,
      status: "open",
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      reposted_at: new Date().toISOString(),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      // 1st call: fetch posting
      if (callCount === 1)
        return buildChain({ data: expiredPosting, error: null });
      // 2nd call: delete applications
      if (callCount === 2) return buildDeleteChain({ data: null, error: null });
      // 3rd call: update posting
      return buildChain({ data: updatedPosting, error: null });
    });

    const res = await POST(makeReq({ days: 7 }), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.posting).toBeDefined();
    expect(body.posting.status).toBe("open");
  });

  it("returns 500 when deleting applications fails", async () => {
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
      return buildDeleteChain({
        data: null,
        error: { message: "delete failed" },
      });
    });

    const res = await POST(makeReq({ days: 7 }), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
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
      if (callCount === 2) return buildDeleteChain({ data: null, error: null });
      return buildChain({ data: null, error: { message: "update failed" } });
    });

    const res = await POST(makeReq({ days: 7 }), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
  });
});
