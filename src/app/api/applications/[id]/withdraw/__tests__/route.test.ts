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

vi.mock("@/lib/api/waitlist-promotion", () => ({
  promoteFromWaitlist: vi.fn().mockResolvedValue(undefined),
}));

const { PATCH } = await import("@/app/api/applications/[id]/withdraw/route");

const MOCK_USER = { id: "user-1", email: "a@b.com" };

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

function makeReq() {
  return new Request("http://localhost/api/applications/app-1/withdraw", {
    method: "PATCH",
  });
}

const routeCtx = { params: Promise.resolve({ id: "app-1" }) };

describe("PATCH /api/applications/[id]/withdraw", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when application not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );

    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the applicant", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      buildChain({
        data: {
          id: "app-1",
          applicant_id: "other-user",
          posting_id: "posting-1",
          status: "pending",
        },
        error: null,
      }),
    );

    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  it("returns 400 when application is not withdrawable", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      buildChain({
        data: {
          id: "app-1",
          applicant_id: "user-1",
          posting_id: "posting-1",
          status: "rejected",
        },
        error: null,
      }),
    );

    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(400);
  });

  it("withdraws a pending application successfully", async () => {
    authedUser();

    const appChain = buildChain({
      data: {
        id: "app-1",
        applicant_id: "user-1",
        posting_id: "posting-1",
        status: "pending",
      },
      error: null,
    });
    const updateChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return appChain;
      return updateChain;
    });

    const res = await PATCH(makeReq(), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.application.status).toBe("withdrawn");
  });

  it("calls promoteFromWaitlist when withdrawing accepted application", async () => {
    authedUser();

    const appChain = buildChain({
      data: {
        id: "app-1",
        applicant_id: "user-1",
        posting_id: "posting-1",
        status: "accepted",
      },
      error: null,
    });
    const updateChain = buildChain({ data: null, error: null });
    const postingChain = buildChain({
      data: {
        id: "posting-1",
        title: "Test",
        creator_id: "owner-1",
        status: "open",
        auto_accept: false,
        team_size_max: 3,
      },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return appChain;
      if (callCount === 2) return updateChain;
      return postingChain;
    });

    const res = await PATCH(makeReq(), routeCtx);
    expect(res.status).toBe(200);

    const { promoteFromWaitlist } =
      await import("@/lib/api/waitlist-promotion");
    expect(promoteFromWaitlist).toHaveBeenCalled();
  });

  it("does not call promoteFromWaitlist when withdrawing pending application", async () => {
    authedUser();

    const appChain = buildChain({
      data: {
        id: "app-1",
        applicant_id: "user-1",
        posting_id: "posting-1",
        status: "pending",
      },
      error: null,
    });
    const updateChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return appChain;
      return updateChain;
    });

    await PATCH(makeReq(), routeCtx);

    const { promoteFromWaitlist } =
      await import("@/lib/api/waitlist-promotion");
    expect(promoteFromWaitlist).not.toHaveBeenCalled();
  });
});
