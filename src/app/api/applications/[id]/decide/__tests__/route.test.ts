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

const { PATCH } = await import("@/app/api/applications/[id]/decide/route");

const MOCK_USER = { id: "owner-1", email: "a@b.com" };

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

function buildChain(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockResolvedValue(resolveValue);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(resolveValue);
  return chain;
}

function makeReq(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/applications/app-1/decide", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? { status: "accepted" }),
  });
}

const routeCtx = { params: Promise.resolve({ id: "app-1" }) };

describe("PATCH /api/applications/[id]/decide", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid status", async () => {
    authedUser();
    const res = await PATCH(makeReq({ status: "invalid" }), routeCtx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when application not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );

    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the posting creator", async () => {
    authedUser();

    const appChain = buildChain({
      data: {
        id: "app-1",
        applicant_id: "user-2",
        posting_id: "posting-1",
        status: "pending",
      },
      error: null,
    });
    const postingChain = buildChain({
      data: {
        id: "posting-1",
        creator_id: "other-owner",
        title: "Test",
        team_size_max: 3,
        status: "open",
      },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return appChain;
      return postingChain;
    });

    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  it("accepts application and notifies applicant", async () => {
    authedUser();

    const appChain = buildChain({
      data: {
        id: "app-1",
        applicant_id: "user-2",
        posting_id: "posting-1",
        status: "pending",
      },
      error: null,
    });
    const postingChain = buildChain({
      data: {
        id: "posting-1",
        creator_id: "owner-1",
        title: "Test Posting",
        team_size_max: 3,
        status: "open",
      },
      error: null,
    });
    const updateChain = buildChain({ data: null, error: null });
    const profileChain = buildChain({
      data: { notification_preferences: null },
      error: null,
    });
    const notifChain = buildChain({ data: null, error: null });
    const countChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Mock count response - not enough to fill
    (countChain as Record<string, unknown>).then = vi
      .fn()
      .mockResolvedValue({ count: 1 });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return appChain;
      if (callCount === 2) return postingChain;
      if (callCount === 3) return updateChain;
      if (callCount === 4) return profileChain;
      if (callCount === 5) return notifChain;
      return buildChain({ data: null, error: null });
    });

    const res = await PATCH(makeReq({ status: "accepted" }), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.application.status).toBe("accepted");
  });

  it("rejects application and notifies applicant", async () => {
    authedUser();

    const appChain = buildChain({
      data: {
        id: "app-1",
        applicant_id: "user-2",
        posting_id: "posting-1",
        status: "pending",
      },
      error: null,
    });
    const postingChain = buildChain({
      data: {
        id: "posting-1",
        creator_id: "owner-1",
        title: "Test Posting",
        team_size_max: 3,
        status: "open",
      },
      error: null,
    });
    const updateChain = buildChain({ data: null, error: null });
    const profileChain = buildChain({
      data: { notification_preferences: null },
      error: null,
    });
    const notifChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return appChain;
      if (callCount === 2) return postingChain;
      if (callCount === 3) return updateChain;
      if (callCount === 4) return profileChain;
      return notifChain;
    });

    const res = await PATCH(makeReq({ status: "rejected" }), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.application.status).toBe("rejected");
  });
});
