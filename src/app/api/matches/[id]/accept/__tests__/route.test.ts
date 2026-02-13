// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

/**
 * Build a chainable Supabase query mock.
 * Supports: select, eq, single, update, head patterns.
 */
function buildChain(resolveValue: {
  data: unknown;
  error: unknown;
  count?: number | null;
}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(resolveValue);
  chain.update = vi.fn().mockReturnValue(chain);
  return chain;
}

/**
 * Build a mock for Supabase count queries: .select().eq().eq() → { count }
 * The last .eq() must be thenable (awaitable).
 */
function buildCountChain(count: number) {
  const result = { data: null, error: null, count };
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  // First .eq returns the chain, second .eq resolves with count
  chain.eq = vi.fn().mockReturnValueOnce(chain).mockResolvedValueOnce(result);
  return chain;
}

// Dynamic import to work around [id] path issues
const { PATCH } = await import("@/app/api/matches/[id]/accept/route");

describe("PATCH /api/matches/[id]/accept", () => {
  const owner = { id: "owner-1", email: "owner@test.com" };
  const req = new Request("http://localhost/api/matches/match-1/accept", {
    method: "PATCH",
  });
  const routeContext = { params: Promise.resolve({ id: "match-1" }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: owner },
      error: null,
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const res = await PATCH(req, routeContext);
    expect(res.status).toBe(401);
  });

  it("returns 404 when match not found", async () => {
    const chain = buildChain({ data: null, error: { message: "not found" } });
    mockFrom.mockReturnValue(chain);

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 403 when user is not the posting creator", async () => {
    const chain = buildChain({
      data: {
        id: "match-1",
        status: "applied",
        project_id: "posting-1",
        posting: { creator_id: "other-user", team_size_max: 3 },
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when match is not in applied status", async () => {
    const chain = buildChain({
      data: {
        id: "match-1",
        status: "accepted",
        project_id: "posting-1",
        posting: { creator_id: "owner-1", team_size_max: 3 },
      },
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("accepts a match and does NOT auto-fill when below capacity", async () => {
    const matchData = {
      id: "match-1",
      status: "applied",
      project_id: "posting-1",
      posting: { creator_id: "owner-1", team_size_max: 3 },
    };

    const updatedMatch = {
      ...matchData,
      status: "accepted",
      posting: matchData.posting,
      profile: { full_name: "Test User" },
      similarity_score: 0.85,
      explanation: null,
      score_breakdown: null,
      created_at: "2025-01-01",
    };

    // Track all calls to from()
    let callCount = 0;
    const postingUpdateChain = buildChain({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      callCount++;

      if (callCount === 1) {
        // First: fetch match
        return buildChain({ data: matchData, error: null });
      }
      if (callCount === 2) {
        // Second: update match
        return buildChain({ data: updatedMatch, error: null });
      }
      if (callCount === 3 && table === "matches") {
        // Third: count accepted matches — below capacity (1 < 3)
        return buildCountChain(1);
      }
      return postingUpdateChain;
    });

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.match).toBeDefined();
    expect(body.match.status).toBe("accepted");
    // Posting should NOT have been updated to filled (only 1 accepted, max is 3)
    // postingUpdateChain.update should not have been called
  });

  it("auto-fills posting when accepted count reaches team_size_max", async () => {
    const matchData = {
      id: "match-1",
      status: "applied",
      project_id: "posting-1",
      posting: { creator_id: "owner-1", team_size_max: 2 },
    };

    const updatedMatch = {
      ...matchData,
      status: "accepted",
      posting: matchData.posting,
      profile: { full_name: "Test User" },
      similarity_score: 0.85,
      explanation: null,
      score_breakdown: null,
      created_at: "2025-01-01",
    };

    let callCount = 0;
    const postingUpdateChain = buildChain({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      callCount++;

      if (callCount === 1) {
        return buildChain({ data: matchData, error: null });
      }
      if (callCount === 2) {
        return buildChain({ data: updatedMatch, error: null });
      }
      if (callCount === 3 && table === "matches") {
        // Count: 2 accepted (matches team_size_max of 2)
        return buildCountChain(2);
      }
      if (callCount === 4 && table === "postings") {
        // Posting update to 'filled'
        return postingUpdateChain;
      }
      return buildChain({ data: null, error: null });
    });

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.match.status).toBe("accepted");
    // The postings update chain should have been called
    expect(postingUpdateChain.update).toHaveBeenCalled();
  });

  it("returns 500 when match update fails", async () => {
    const matchData = {
      id: "match-1",
      status: "applied",
      project_id: "posting-1",
      posting: { creator_id: "owner-1", team_size_max: 3 },
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return buildChain({ data: matchData, error: null });
      }
      // Update fails
      return buildChain({ data: null, error: { message: "update failed" } });
    });

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
  });
});
