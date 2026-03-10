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
const { GET } = await import("@/app/api/matches/[id]/route");

const req = new Request("http://localhost/api/matches/match-1");
const routeCtx = { params: Promise.resolve({ id: "match-1" }) };

describe("GET /api/matches/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresAuth(GET, () => req, routeCtx, mockGetUser);
  testRequiresResource(GET, () => req, routeCtx, mockGetUser, mockFrom);
  testRequiresOwnership(GET, () => req, routeCtx, mockGetUser, () => {
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
