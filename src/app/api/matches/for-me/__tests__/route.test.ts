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

import { GET } from "../route";

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

const makeReq = () => new Request("http://localhost/api/matches/for-me");
const routeCtx = { params: Promise.resolve({}) };

describe("GET /api/matches/for-me", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await GET(makeReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns empty matches when profile not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({ data: null, error: { message: "not found" } }),
    );

    const res = await GET(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matches).toEqual([]);
    expect(body.error).toContain("Profile not found");
  });

  it("returns empty matches when profile has no data", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({
        data: { bio: null, skills: [], headline: null },
        error: null,
      }),
    );

    const res = await GET(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matches).toEqual([]);
    expect(body.error).toContain("bio");
  });

  it("returns matches successfully", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({
        data: { bio: "Developer", skills: ["React"], headline: "Dev" },
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

    const res = await GET(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].id).toBe("m1");
    expect(body.matches[0].score).toBe(0.85);
    expect(mockMatchProfileToPostings).toHaveBeenCalledWith("user-1", 10);
    expect(mockCreateMatchRecords).toHaveBeenCalled();
  });

  it("returns empty array when no matches found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({
        data: { bio: "Developer", skills: ["React"], headline: "Dev" },
        error: null,
      }),
    );
    mockMatchProfileToPostings.mockResolvedValue([]);

    const res = await GET(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matches).toEqual([]);
    expect(mockCreateMatchRecords).not.toHaveBeenCalled();
  });
});
