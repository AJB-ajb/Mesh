// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildChain,
  buildCountChain,
  authedUser,
} from "tests/utils/supabase-mock";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

// ---------- Notification mock ----------
const mockNotifyIfPreferred = vi.fn();
vi.mock("@/lib/api/notify-if-preferred", () => ({
  notifyIfPreferred: (...args: unknown[]) => mockNotifyIfPreferred(...args),
}));

const { GET, POST } = await import("@/app/api/postings/[id]/proposals/route");

const routeCtx = { params: Promise.resolve({ id: "posting-1" }) };

function makeGetReq() {
  return new Request("http://localhost/api/postings/posting-1/proposals");
}

function makePostReq(body: Record<string, unknown>) {
  return new Request("http://localhost/api/postings/posting-1/proposals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/postings/[id]/proposals", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await GET(makeGetReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a team member", async () => {
    authedUser(mockGetUser);
    mockRpc.mockResolvedValue({ data: false, error: null });

    const res = await GET(makeGetReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  it("returns proposals for team members", async () => {
    authedUser(mockGetUser);
    mockRpc.mockResolvedValue({ data: true, error: null });

    const proposals = [
      { id: "p1", posting_id: "posting-1", status: "proposed" },
    ];
    mockFrom.mockReturnValue(buildChain({ data: proposals, error: null }));

    const res = await GET(makeGetReq(), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.proposals).toHaveLength(1);
  });
});

describe("POST /api/postings/[id]/proposals", () => {
  beforeEach(() => vi.clearAllMocks());

  const validBody = {
    title: "Team sync",
    startTime: "2026-03-10T10:00:00Z",
    endTime: "2026-03-10T11:00:00Z",
  };

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await POST(makePostReq(validBody), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not posting owner", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: { id: "posting-1", creator_id: "other-user" },
        error: null,
      }),
    );

    const res = await POST(makePostReq(validBody), routeCtx);
    expect(res.status).toBe(403);
  });

  it("returns 400 when startTime or endTime is missing", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: { id: "posting-1", creator_id: "user-1" },
        error: null,
      }),
    );

    const res = await POST(makePostReq({ title: "Test" }), routeCtx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when endTime is before startTime", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: { id: "posting-1", creator_id: "user-1" },
        error: null,
      }),
    );

    const res = await POST(
      makePostReq({
        startTime: "2026-03-10T11:00:00Z",
        endTime: "2026-03-10T10:00:00Z",
      }),
      routeCtx,
    );
    expect(res.status).toBe(400);
  });

  it("creates proposal and notifies team members", async () => {
    authedUser(mockGetUser);

    // ownership check
    const ownershipChain = buildChain({
      data: { id: "posting-1", creator_id: "user-1" },
      error: null,
    });
    // count check
    const countChain = buildCountChain(0);
    // insert
    const insertChain = buildChain({
      data: {
        id: "proposal-1",
        posting_id: "posting-1",
        proposed_by: "user-1",
        title: "Team sync",
        start_time: validBody.startTime,
        end_time: validBody.endTime,
        status: "proposed",
      },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return ownershipChain;
      if (callCount === 2) return countChain;
      return insertChain;
    });

    // Mock RPC for getting team member IDs (excluding the owner)
    mockRpc.mockResolvedValue({
      data: ["user-1", "member-1", "member-2"],
      error: null,
    });

    const res = await POST(makePostReq(validBody), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.proposal).toBeDefined();

    // Should notify non-owner team members about the new proposal
    expect(mockNotifyIfPreferred).toHaveBeenCalled();
    const notifyCalls = mockNotifyIfPreferred.mock.calls;
    // Should notify member-1 and member-2 (not the owner user-1)
    const notifiedUserIds = notifyCalls.map(
      (call: unknown[]) => (call[3] as { userId: string }).userId,
    );
    expect(notifiedUserIds).toContain("member-1");
    expect(notifiedUserIds).toContain("member-2");
    expect(notifiedUserIds).not.toContain("user-1");
  });
});
