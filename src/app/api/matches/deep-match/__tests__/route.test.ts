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

// ---------- Deep match mock ----------
const mockDeepMatchCandidate = vi.fn();
const mockIsDeepMatchAvailable = vi.fn();

vi.mock("@/lib/matching/deep-match", () => ({
  deepMatchCandidate: (...args: unknown[]) => mockDeepMatchCandidate(...args),
  isDeepMatchAvailable: () => mockIsDeepMatchAvailable(),
}));

// ---------- Tier mock ----------
const mockGetUserTier = vi.fn();
const mockCanAccessFeature = vi.fn();

vi.mock("@/lib/api/tiers", () => ({
  getUserTier: (...args: unknown[]) => mockGetUserTier(...args),
  canAccessFeature: (...args: unknown[]) => mockCanAccessFeature(...args),
}));

// ---------- Rate limit mock ----------
const { mockCheck } = vi.hoisted(() => ({ mockCheck: vi.fn() }));

vi.mock("@/lib/api/rate-limit", () => ({
  createRateLimiter: () => ({ check: mockCheck }),
}));

import { buildChain, authedUser } from "tests/utils/supabase-mock";
import { testRequiresAuth } from "tests/utils/route-test-helpers";

import { POST } from "../route";

const makeReq = (body?: Record<string, unknown>) =>
  new Request("http://localhost/api/matches/deep-match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? { matchIds: ["m1"] }),
  });
const routeCtx = { params: Promise.resolve({}) };

describe("POST /api/matches/deep-match", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: pro tier, access allowed, rate limit ok, deep match available
    mockGetUserTier.mockResolvedValue("pro");
    mockCanAccessFeature.mockReturnValue(true);
    mockCheck.mockReturnValue({ allowed: true });
    mockIsDeepMatchAvailable.mockReturnValue(true);
  });

  testRequiresAuth(POST, makeReq, routeCtx, mockGetUser);

  it("returns 403 for free tier users", async () => {
    authedUser(mockGetUser);
    mockGetUserTier.mockResolvedValue("free");
    mockCanAccessFeature.mockReturnValue(false);

    const res = await POST(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toContain("Pro plan");
  });

  it("returns 429 when rate-limited", async () => {
    authedUser(mockGetUser);
    mockCheck.mockReturnValue({ allowed: false, retryAfter: 1800 });

    const res = await POST(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(res.headers.get("Retry-After")).toBe("1800");
  });

  it("returns 503 when deep match is not configured", async () => {
    authedUser(mockGetUser);
    mockIsDeepMatchAvailable.mockReturnValue(false);

    const res = await POST(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.error.message).toContain("not configured");
  });

  it("returns 400 when matchIds is missing", async () => {
    authedUser(mockGetUser);

    const res = await POST(
      new Request("http://localhost/api/matches/deep-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      routeCtx,
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain("matchIds");
  });

  it("returns results for valid match IDs", async () => {
    authedUser(mockGetUser);

    const matchChain = buildChain({
      data: [
        {
          id: "m1",
          posting_id: "p1",
          user_id: "user-1",
          similarity_score: 0.7,
          score_breakdown: { semantic: 0.8 },
        },
      ],
      error: null,
    });
    const postingChain = buildChain({
      data: [
        {
          id: "p1",
          title: "React Project",
          source_text: "Looking for React dev",
          description: "",
        },
      ],
      error: null,
    });
    const profileChain = buildChain({
      data: [
        {
          user_id: "user-1",
          source_text: "Experienced React developer",
          bio: "",
          headline: "",
        },
      ],
      error: null,
    });
    const updateChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return matchChain;
      if (callCount === 2) return postingChain;
      if (callCount === 3) return profileChain;
      return updateChain;
    });

    mockDeepMatchCandidate.mockResolvedValue({
      score: 85,
      explanation: "Great match",
      concerns: [],
      matchedRole: "developer",
    });

    const res = await POST(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.results[0].matchId).toBe("m1");
    expect(body.results[0].result.score).toBe(85);
    expect(mockDeepMatchCandidate).toHaveBeenCalled();
  });
});
