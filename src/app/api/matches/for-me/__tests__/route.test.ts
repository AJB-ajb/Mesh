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

import { buildChain, authedUser } from "tests/utils/supabase-mock";
import { testRequiresAuth } from "tests/utils/route-test-helpers";

import { GET } from "../route";

const makeReq = () => new Request("http://localhost/api/matches/for-me");
const routeCtx = { params: Promise.resolve({}) };

describe("GET /api/matches/for-me", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresAuth(GET, makeReq, routeCtx, mockGetUser);

  it("returns empty matches when profile not found", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );

    const res = await GET(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matches).toEqual([]);
    expect(body.error).toContain("Profile not found");
  });

  it("returns empty matches when profile has no data", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
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
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
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
    expect(mockMatchProfileToPostings).toHaveBeenCalledWith(
      "user-1",
      10,
      {},
      false,
    );
    expect(mockCreateMatchRecords).toHaveBeenCalled();
  });

  it("returns empty array when no matches found", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({
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
