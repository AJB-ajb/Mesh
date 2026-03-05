// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain, authedUser } from "tests/utils/supabase-mock";

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
const { GET } = await import("@/app/api/matches/[id]/route");

const req = new Request("http://localhost/api/matches/match-1");
const routeCtx = { params: Promise.resolve({ id: "match-1" }) };

describe("GET /api/matches/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await GET(req, routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when match not found", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );

    const res = await GET(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 403 when user has no access to match", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
        data: {
          id: "match-1",
          user_id: "other-user",
          status: "pending",
          similarity_score: 0.8,
          explanation: null,
          score_breakdown: null,
          created_at: "2026-01-01",
          project: { id: "p1", creator_id: "another-user" },
          profile: { id: "pr1" },
        },
        error: null,
      }),
    );

    const res = await GET(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns match details when user is the matched user", async () => {
    authedUser(mockGetUser);
    const matchData = {
      id: "match-1",
      user_id: "user-1",
      status: "applied",
      similarity_score: 0.85,
      explanation: "Good fit",
      score_breakdown: { skills: 0.9 },
      created_at: "2026-01-01",
      project: { id: "p1", title: "Project", creator_id: "other-user" },
      profile: { id: "pr1", full_name: "Jane" },
    };
    mockFrom.mockReturnValue(buildChain({ data: matchData, error: null }));

    const res = await GET(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.match.id).toBe("match-1");
    expect(body.match.status).toBe("applied");
    expect(body.match.score).toBe(0.85);
  });

  it("returns match details when user is the posting creator", async () => {
    authedUser(mockGetUser);
    const matchData = {
      id: "match-1",
      user_id: "other-user",
      status: "applied",
      similarity_score: 0.75,
      explanation: null,
      score_breakdown: null,
      created_at: "2026-01-01",
      project: { id: "p1", title: "Project", creator_id: "user-1" },
      profile: { id: "pr1", full_name: "Jane" },
    };
    mockFrom.mockReturnValue(buildChain({ data: matchData, error: null }));

    const res = await GET(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.match.id).toBe("match-1");
  });
});
