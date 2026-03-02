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

// ---------- Matching module mock ----------
const mockMatchProfileToPostings = vi.fn();
const mockCreateMatchRecords = vi.fn();

vi.mock("@/lib/matching/profile-to-posting", () => ({
  matchProfileToPostings: (...args: unknown[]) =>
    mockMatchProfileToPostings(...args),
  createMatchRecords: (...args: unknown[]) => mockCreateMatchRecords(...args),
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

import { POST } from "../route";

const MOCK_USER = { id: "user-1", email: "a@b.com" };

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

/** Chainable Supabase query mock */
function chain(finalValue: { data: unknown; error: unknown }) {
  const self: Record<string, unknown> = {};
  for (const m of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "single",
    "maybeSingle",
  ]) {
    self[m] = vi.fn(() => self);
  }
  self.single = vi.fn(() => Promise.resolve(finalValue));
  self.then = (resolve: (v: unknown) => void) => resolve(finalValue);
  return self;
}

const makeReq = () =>
  new Request("http://localhost/api/matches/deep-match", { method: "POST" });
const routeCtx = { params: Promise.resolve({}) };

describe("POST /api/matches/deep-match", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: pro tier, access allowed, rate limit ok
    mockGetUserTier.mockResolvedValue("pro");
    mockCanAccessFeature.mockReturnValue(true);
    mockCheck.mockReturnValue({ allowed: true });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await POST(makeReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 403 for free tier users", async () => {
    authedUser();
    mockGetUserTier.mockResolvedValue("free");
    mockCanAccessFeature.mockReturnValue(false);

    const res = await POST(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toContain("Pro plan");
  });

  it("returns 429 when rate-limited", async () => {
    authedUser();
    mockCheck.mockReturnValue({ allowed: false, retryAfter: 1800 });

    const res = await POST(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error.code).toBe("FORBIDDEN");
    expect(res.headers.get("Retry-After")).toBe("1800");
  });

  it("returns matches successfully", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({
        data: { bio: "Developer", headline: "Dev" },
        error: null,
      }),
    );

    const matches = [
      {
        matchId: "m1",
        posting: {
          id: "p1",
          title: "React Project",
          created_at: "2026-01-01",
        },
        score: 0.85,
        scoreBreakdown: { skills: 0.9 },
      },
    ];
    mockMatchProfileToPostings.mockResolvedValue(matches);
    mockCreateMatchRecords.mockResolvedValue(undefined);

    const res = await POST(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].id).toBe("m1");
    expect(body.matches[0].score).toBe(0.85);
    expect(mockMatchProfileToPostings).toHaveBeenCalledWith("user-1", 20);
    expect(mockCreateMatchRecords).toHaveBeenCalled();
  });

  it("returns 400 when profile not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({ data: null, error: { message: "not found" } }),
    );

    const res = await POST(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.message).toContain("Profile not found");
  });
});
