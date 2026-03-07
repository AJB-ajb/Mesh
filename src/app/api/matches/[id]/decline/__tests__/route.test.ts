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
const { PATCH } = await import("@/app/api/matches/[id]/decline/route");

const req = new Request("http://localhost/api/matches/match-1/decline", {
  method: "PATCH",
});
const routeCtx = { params: Promise.resolve({ id: "match-1" }) };

describe("PATCH /api/matches/[id]/decline", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresAuth(PATCH, () => req, routeCtx, mockGetUser);
  testRequiresResource(PATCH, () => req, routeCtx, mockGetUser, mockFrom);
  testRequiresOwnership(PATCH, () => req, routeCtx, mockGetUser, () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: {
          id: "match-1",
          status: "applied",
          project: { creator_id: "other-user" },
        },
        error: null,
      }),
    );
  });

  it("returns 400 when match is not in applied status", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: {
          id: "match-1",
          status: "pending",
          project: { creator_id: "user-1" },
        },
        error: null,
      }),
    );

    const res = await PATCH(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("declines match successfully", async () => {
    authedUser(mockGetUser);

    const matchData = {
      id: "match-1",
      status: "applied",
      project: { creator_id: "user-1" },
    };
    const updatedMatch = {
      id: "match-1",
      status: "declined",
      similarity_score: 0.7,
      explanation: null,
      score_breakdown: null,
      created_at: "2026-01-01",
      project: { id: "p1", title: "Project", creator_id: "user-1" },
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
    expect(body.match.status).toBe("declined");
  });

  it("returns 500 when update fails", async () => {
    authedUser(mockGetUser);

    const matchData = {
      id: "match-1",
      status: "applied",
      project: { creator_id: "user-1" },
    };

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
