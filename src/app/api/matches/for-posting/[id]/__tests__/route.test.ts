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

// Dynamic import for [id] path
const { GET } = await import("@/app/api/matches/for-posting/[id]/route");

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
  new Request("http://localhost/api/matches/for-posting/posting-1");
const routeCtx = { params: Promise.resolve({ id: "posting-1" }) };

describe("GET /api/matches/for-posting/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await GET(makeReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 404 when posting not found", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({ data: null, error: { message: "not found" } }),
    );

    const res = await GET(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 403 when user is not the posting creator", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({ data: { creator_id: "other-user" }, error: null }),
    );

    const res = await GET(makeReq(), routeCtx);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns matches successfully", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      chain({ data: { creator_id: "user-1" }, error: null }),
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
    expect(mockMatchPostingToProfiles).toHaveBeenCalledWith("posting-1", 10);
  });
});
