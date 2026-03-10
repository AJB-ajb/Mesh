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
const mockMatchPostingToProfiles = vi.fn();
const mockCreateMatchRecordsForPosting = vi.fn();

vi.mock("@/lib/matching/posting-to-profile", () => ({
  matchPostingToProfiles: (...args: unknown[]) =>
    mockMatchPostingToProfiles(...args),
  createMatchRecordsForPosting: (...args: unknown[]) =>
    mockCreateMatchRecordsForPosting(...args),
}));

import { buildChain, authedUser } from "tests/utils/supabase-mock";
import { testRequiresAuth, testRequiresResource, testRequiresOwnership } from "tests/utils/route-test-helpers";

// Dynamic import for [id] path
const { GET } = await import("@/app/api/matches/for-posting/[id]/route");

const makeReq = () =>
  new Request("http://localhost/api/matches/for-posting/posting-1");
const routeCtx = { params: Promise.resolve({ id: "posting-1" }) };

describe("GET /api/matches/for-posting/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  testRequiresAuth(GET, makeReq, routeCtx, mockGetUser);
  testRequiresResource(GET, makeReq, routeCtx, mockGetUser, mockFrom);
  testRequiresOwnership(GET, makeReq, routeCtx, mockGetUser, () => {
    mockFrom.mockReturnValue(
      buildChain({ data: { creator_id: "other-user" }, error: null }),
    );
  });

  it("returns matches successfully", async () => {
    authedUser(mockGetUser);
    mockFrom.mockReturnValue(
      buildChain({ data: { creator_id: "user-1" }, error: null }),
    );

    const matches = [
      {
        matchId: "m1",
        profile: { id: "p1", full_name: "Jane Doe" },
        score: 0.9,
        scoreBreakdown: { skills: 0.95 },
      },
    ];
    mockMatchPostingToProfiles.mockResolvedValue(matches);
    mockCreateMatchRecordsForPosting.mockResolvedValue(undefined);

    const res = await GET(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].id).toBe("m1");
    expect(body.matches[0].score).toBe(0.9);
    expect(mockMatchPostingToProfiles).toHaveBeenCalledWith(
      "posting-1",
      10,
      false,
    );
  });
});
