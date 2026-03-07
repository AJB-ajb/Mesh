// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { testRequiresAuth, testRequiresResource, testRequiresOwnership } from "tests/utils/route-test-helpers";

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

/**
 * Build mock for markPostingFilledIfFull:
 * 1. Fetch posting team_size_max
 * 2. Count accepted rows
 * 3. Optionally update posting to filled
 */
function buildFulfillmentMocks(teamSizeMax: number, acceptedCount: number) {
  const postingFetchChain = buildChain({
    data: { team_size_max: teamSizeMax },
    error: null,
  });
  const countChain = buildCountChain(acceptedCount);
  const updateChain = buildChain({ data: null, error: null });
  return { postingFetchChain, countChain, updateChain };
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

  testRequiresAuth(PATCH, () => req, routeContext, mockGetUser);
  testRequiresResource(PATCH, () => req, routeContext, mockGetUser, mockFrom);
  testRequiresOwnership(PATCH, () => req, routeContext, mockGetUser, () => {
    mockFrom.mockReturnValue(
      buildChain({
        data: {
          id: "match-1",
          status: "applied",
          project_id: "posting-1",
          posting: { creator_id: "other-user", team_size_max: 3 },
        },
        error: null,
      }),
    );
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

    // markPostingFilledIfFull: fetch posting, count accepted, no update
    const fulfillment = buildFulfillmentMocks(3, 1);

    let callCount = 0;
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
      if (callCount === 3 && table === "postings") {
        // Third: markPostingFilledIfFull fetches posting's team_size_max
        return fulfillment.postingFetchChain;
      }
      if (callCount === 4 && table === "matches") {
        // Fourth: markPostingFilledIfFull counts accepted matches
        return fulfillment.countChain;
      }
      return buildChain({ data: null, error: null });
    });

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.match).toBeDefined();
    expect(body.match.status).toBe("accepted");
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

    // markPostingFilledIfFull: fetch posting (max=2), count accepted (2), update to filled
    const fulfillment = buildFulfillmentMocks(2, 2);

    let callCount = 0;
    mockFrom.mockImplementation((table: string) => {
      callCount++;

      if (callCount === 1) {
        return buildChain({ data: matchData, error: null });
      }
      if (callCount === 2) {
        return buildChain({ data: updatedMatch, error: null });
      }
      if (callCount === 3 && table === "postings") {
        // markPostingFilledIfFull fetches posting's team_size_max
        return fulfillment.postingFetchChain;
      }
      if (callCount === 4 && table === "matches") {
        // markPostingFilledIfFull counts accepted matches (2 >= 2)
        return fulfillment.countChain;
      }
      if (callCount === 5 && table === "postings") {
        // markPostingFilledIfFull updates posting to filled
        return fulfillment.updateChain;
      }
      return buildChain({ data: null, error: null });
    });

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.match.status).toBe("accepted");
    // The postings update chain should have been called
    expect(fulfillment.updateChain.update).toHaveBeenCalled();
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
