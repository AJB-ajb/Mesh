// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain, authedUser } from "tests/utils/supabase-mock";
import { testRequiresAuth, testRequiresResource, testRequiresOwnership } from "tests/utils/route-test-helpers";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Dynamic import for [id] path
const { PATCH } = await import("@/app/api/matches/[id]/apply/route");

const req = new Request("http://localhost/api/matches/match-1/apply", {
  method: "PATCH",
});
const routeCtx = { params: Promise.resolve({ id: "match-1" }) };

describe("PATCH /api/matches/[id]/apply", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresAuth(PATCH, () => req, routeCtx, mockGetUser);
  testRequiresResource(PATCH, () => req, routeCtx, mockGetUser, mockFrom);
  testRequiresOwnership(PATCH, () => req, routeCtx, mockGetUser, () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: { id: "match-1", user_id: "other-user", status: "pending" },
        error: null,
      }),
    );
  });

  it("returns 400 when match is not in pending status", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: { id: "match-1", user_id: "user-1", status: "applied" },
        error: null,
      }),
    );

    const res = await PATCH(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("applies to match successfully", async () => {
    authedUser(mockGetUser);

    const matchData = { id: "match-1", user_id: "user-1", status: "pending" };
    const updatedMatch = {
      id: "match-1",
      user_id: "user-1",
      status: "applied",
      similarity_score: 0.8,
      explanation: "Good match",
      score_breakdown: { skills: 0.9 },
      created_at: "2026-01-01",
      project: { id: "p1", title: "Project" },
      profile: { id: "pr1", full_name: "Jane" },
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildChain({ data: matchData, error: null });
      }
      return buildChain({ data: updatedMatch, error: null });
    });

    const res = await PATCH(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.match.status).toBe("applied");
  });

  it("returns 500 when update fails", async () => {
    authedUser(mockGetUser);

    const matchData = { id: "match-1", user_id: "user-1", status: "pending" };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildChain({ data: matchData, error: null });
      }
      return buildChain({ data: null, error: { message: "update failed" } });
    });

    const res = await PATCH(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
  });
});
