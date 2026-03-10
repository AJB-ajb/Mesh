import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Mock withAuth to pass through the handler with a fake auth context.
// This lets us test the actual route logic (tier gating, ownership,
// caching, explanation generation) without a real Supabase session.
// ---------------------------------------------------------------------------

type MockQueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function createQueryBuilder(resolvedData: unknown = null, error: unknown = null): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    update: vi.fn().mockReturnThis(),
  };
  // Allow chaining .select().eq().eq().single()
  builder.select = vi.fn(() => builder);
  builder.eq = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  return builder;
}

// We'll configure these per-test
let mockUser = { id: "user-1" };
let mockSupabaseFrom: ReturnType<typeof vi.fn>;

vi.mock("@/lib/api/with-auth", () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  withAuth: (handler: Function) => {
    // Return a Next.js-style route handler that calls the inner handler
    return async (req: Request, routeContext: { params: Promise<Record<string, string>> }) => {
      const params = await routeContext.params;
      return handler(req, {
        user: mockUser,
        supabase: { from: mockSupabaseFrom },
        params,
      });
    };
  },
}));

const mockGetUserTier = vi.fn();
const mockCanAccessFeature = vi.fn();
vi.mock("@/lib/tier", () => ({
  getUserTier: (...args: unknown[]) => mockGetUserTier(...args),
  canAccessFeature: (...args: unknown[]) => mockCanAccessFeature(...args),
}));

const mockIsGeminiConfigured = vi.fn();
vi.mock("@/lib/ai/gemini", () => ({
  isGeminiConfigured: () => mockIsGeminiConfigured(),
}));

const mockGenerateMatchExplanation = vi.fn();
vi.mock("@/lib/matching/explanation", () => ({
  generateMatchExplanation: (...args: unknown[]) =>
    mockGenerateMatchExplanation(...args),
}));

// Import AFTER mocks are set up
import { POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest() {
  return new Request("http://localhost/api/matches/match-1/explain", {
    method: "POST",
  });
}

function makeRouteContext(id = "match-1") {
  return { params: Promise.resolve({ id }) };
}

async function getBody(res: NextResponse) {
  return res.json();
}

// ---------------------------------------------------------------------------
// Default Supabase stubs — individual tests override as needed
// ---------------------------------------------------------------------------

const defaultMatch = {
  id: "match-1",
  posting_id: "posting-1",
  user_id: "user-1",
  similarity_score: 0.85,
  explanation: null as string | null,
  score_breakdown: {},
};

const defaultPosting = {
  creator_id: "user-1",
  title: "React Dev",
  description: "Build stuff",
};

const defaultProfile = {
  bio: "I build things",
  interests: ["React"],
  location_preference: "remote",
};

function setupSupabase(overrides: {
  match?: typeof defaultMatch | null;
  matchError?: unknown;
  posting?: typeof defaultPosting | null;
  profile?: Record<string, unknown> | null;
  postingSkills?: Array<{ skill_nodes: { name: string } }>;
} = {}) {
  const {
    match = defaultMatch,
    matchError = null,
    posting = defaultPosting,
    profile = defaultProfile,
    postingSkills = [{ skill_nodes: { name: "React" } }],
  } = overrides;

  mockSupabaseFrom = vi.fn((table: string) => {
    if (table === "matches") {
      const builder = createQueryBuilder(match, matchError);
      // Also handle .update() calls for caching
      builder.update = vi.fn(() => builder);
      return builder;
    }
    if (table === "postings") {
      return createQueryBuilder(posting);
    }
    if (table === "profiles") {
      return createQueryBuilder(profile);
    }
    if (table === "posting_skills") {
      const builder = createQueryBuilder();
      builder.single = undefined as never; // posting_skills doesn't use .single()
      // Override eq to resolve with array data
      const eqResult = { data: postingSkills, error: null };
      builder.eq = vi.fn().mockResolvedValue(eqResult);
      builder.select = vi.fn(() => builder);
      return builder;
    }
    return createQueryBuilder();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/matches/[id]/explain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: "user-1" };
    mockGetUserTier.mockResolvedValue("premium");
    mockCanAccessFeature.mockReturnValue(true);
    mockIsGeminiConfigured.mockReturnValue(true);
    mockGenerateMatchExplanation.mockResolvedValue(
      "Great match because of React skills.",
    );
    setupSupabase();
  });

  // -----------------------------------------------------------------------
  // Match not found
  // -----------------------------------------------------------------------

  it("returns 404 when match does not exist", async () => {
    setupSupabase({ match: null, matchError: { code: "PGRST116" } });

    const res = await POST(makeRequest(), makeRouteContext());
    expect(res.status).toBe(404);

    const body = await getBody(res);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  // -----------------------------------------------------------------------
  // Ownership verification
  // -----------------------------------------------------------------------

  it("returns 403 when the user does not own the match or posting", async () => {
    // Match belongs to user-2, posting created by user-3 — neither is user-1
    setupSupabase({
      match: { ...defaultMatch, user_id: "user-2" },
      posting: { ...defaultPosting, creator_id: "user-3" },
    });

    const res = await POST(makeRequest(), makeRouteContext());
    expect(res.status).toBe(403);

    const body = await getBody(res);
    expect(body.error.message).toContain("do not have access");
  });

  it("allows the posting creator to view someone else's match explanation", async () => {
    // Match belongs to user-2 but posting is created by user-1 (the caller)
    setupSupabase({
      match: { ...defaultMatch, user_id: "user-2" },
      posting: { ...defaultPosting, creator_id: "user-1" },
    });

    const res = await POST(makeRequest(), makeRouteContext());
    expect(res.status).toBe(200);
  });

  // -----------------------------------------------------------------------
  // Tier gating
  // -----------------------------------------------------------------------

  it("returns 403 when user tier cannot access onDemandExplanation", async () => {
    mockGetUserTier.mockResolvedValue("free");
    mockCanAccessFeature.mockReturnValue(false);

    const res = await POST(makeRequest(), makeRouteContext());
    expect(res.status).toBe(403);

    const body = await getBody(res);
    expect(body.error.message).toContain("premium");
  });

  it("calls canAccessFeature with the resolved tier and correct feature", async () => {
    mockGetUserTier.mockResolvedValue("free");
    mockCanAccessFeature.mockReturnValue(false);

    await POST(makeRequest(), makeRouteContext());

    expect(mockGetUserTier).toHaveBeenCalledWith("user-1");
    expect(mockCanAccessFeature).toHaveBeenCalledWith(
      "free",
      "onDemandExplanation",
    );
  });

  // -----------------------------------------------------------------------
  // Cached explanation
  // -----------------------------------------------------------------------

  it("returns cached explanation without calling Gemini", async () => {
    setupSupabase({
      match: {
        ...defaultMatch,
        explanation: "Previously generated explanation",
      },
    });

    const res = await POST(makeRequest(), makeRouteContext());
    expect(res.status).toBe(200);

    const body = await getBody(res);
    expect(body.explanation).toBe("Previously generated explanation");
    expect(body.cached).toBe(true);
    expect(mockGenerateMatchExplanation).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Gemini not configured
  // -----------------------------------------------------------------------

  it("returns 503 when Gemini is not configured", async () => {
    mockIsGeminiConfigured.mockReturnValue(false);

    const res = await POST(makeRequest(), makeRouteContext());
    expect(res.status).toBe(503);

    const body = await getBody(res);
    expect(body.error.code).toBe("INTERNAL");
  });

  // -----------------------------------------------------------------------
  // Happy path — generates and caches explanation
  // -----------------------------------------------------------------------

  it("generates explanation and returns cached: false", async () => {
    const res = await POST(makeRequest(), makeRouteContext());
    expect(res.status).toBe(200);

    const body = await getBody(res);
    expect(body.explanation).toBe("Great match because of React skills.");
    expect(body.cached).toBe(false);
    expect(mockGenerateMatchExplanation).toHaveBeenCalledOnce();
  });
});
