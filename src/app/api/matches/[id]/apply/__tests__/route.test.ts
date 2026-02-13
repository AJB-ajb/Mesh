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

// Dynamic import for [id] path
const { PATCH } = await import("@/app/api/matches/[id]/apply/route");

const MOCK_USER = { id: "user-1", email: "a@b.com" };

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

/** Chainable Supabase query mock */
function buildChain(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(resolveValue);
  return chain;
}

const req = new Request("http://localhost/api/matches/match-1/apply", {
  method: "PATCH",
});
const routeCtx = { params: Promise.resolve({ id: "match-1" }) };

describe("PATCH /api/matches/[id]/apply", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await PATCH(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when match not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );

    const res = await PATCH(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 403 when user is not the matched user", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      buildChain({
        data: { id: "match-1", user_id: "other-user", status: "pending" },
        error: null,
      }),
    );

    const res = await PATCH(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when match is not in pending status", async () => {
    authedUser();
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
    authedUser();

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
    authedUser();

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
