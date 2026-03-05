// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain, authedUser } from "tests/utils/supabase-mock";

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

const { PATCH } =
  await import("@/app/api/postings/[id]/proposals/[proposalId]/route");

const routeCtx = {
  params: Promise.resolve({ id: "posting-1", proposalId: "proposal-1" }),
};

function makePatchReq(body: Record<string, unknown>) {
  return new Request(
    "http://localhost/api/postings/posting-1/proposals/proposal-1",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("PATCH /api/postings/[id]/proposals/[proposalId]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await PATCH(makePatchReq({ status: "confirmed" }), routeCtx);
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

    const res = await PATCH(makePatchReq({ status: "confirmed" }), routeCtx);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid status", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: { id: "posting-1", creator_id: "user-1" },
        error: null,
      }),
    );

    const res = await PATCH(makePatchReq({ status: "invalid" }), routeCtx);
    expect(res.status).toBe(400);
  });

  it("returns 400 when proposal is not in proposed status", async () => {
    authedUser(mockGetUser);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // posting ownership check
        return buildChain({
          data: { id: "posting-1", creator_id: "user-1" },
          error: null,
        });
      }
      // proposal status check — already confirmed
      return buildChain({
        data: { status: "confirmed" },
        error: null,
      });
    });

    const res = await PATCH(makePatchReq({ status: "confirmed" }), routeCtx);
    expect(res.status).toBe(400);
  });

  it("confirms proposal and notifies team members", async () => {
    authedUser(mockGetUser);

    const confirmedProposal = {
      id: "proposal-1",
      posting_id: "posting-1",
      proposed_by: "user-1",
      title: "Team sync",
      start_time: "2026-03-10T10:00:00Z",
      end_time: "2026-03-10T11:00:00Z",
      status: "confirmed",
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // posting ownership check
        return buildChain({
          data: { id: "posting-1", creator_id: "user-1" },
          error: null,
        });
      }
      if (callCount === 2) {
        // proposal status check
        return buildChain({
          data: { status: "proposed" },
          error: null,
        });
      }
      // update proposal
      return buildChain({
        data: confirmedProposal,
        error: null,
      });
    });

    // Mock RPC for getting team member IDs
    mockRpc.mockResolvedValue({
      data: ["user-1", "member-1", "member-2"],
      error: null,
    });

    const res = await PATCH(makePatchReq({ status: "confirmed" }), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.proposal.status).toBe("confirmed");

    // Should notify non-owner team members about the confirmed meeting
    expect(mockNotifyIfPreferred).toHaveBeenCalled();
    const notifyCalls = mockNotifyIfPreferred.mock.calls;
    const notifiedUserIds = notifyCalls.map(
      (call: unknown[]) => (call[3] as { userId: string }).userId,
    );
    expect(notifiedUserIds).toContain("member-1");
    expect(notifiedUserIds).toContain("member-2");
    expect(notifiedUserIds).not.toContain("user-1");
  });

  it("cancels proposal and notifies team members", async () => {
    authedUser(mockGetUser);

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildChain({
          data: { id: "posting-1", creator_id: "user-1" },
          error: null,
        });
      }
      if (callCount === 2) {
        return buildChain({
          data: { status: "proposed" },
          error: null,
        });
      }
      return buildChain({
        data: {
          id: "proposal-1",
          posting_id: "posting-1",
          status: "cancelled",
        },
        error: null,
      });
    });

    mockRpc.mockResolvedValue({
      data: ["user-1", "member-1"],
      error: null,
    });

    const res = await PATCH(makePatchReq({ status: "cancelled" }), routeCtx);
    expect(res.status).toBe(200);

    // Should notify team members about cancellation
    expect(mockNotifyIfPreferred).toHaveBeenCalled();
  });
});
