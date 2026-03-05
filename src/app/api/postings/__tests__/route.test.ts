// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain, authedUser } from "tests/utils/supabase-mock";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/api/trigger-embedding-server", () => ({
  triggerEmbeddingGenerationServer: vi.fn().mockResolvedValue(undefined),
}));

const { POST } = await import("@/app/api/postings/route");

// Custom MOCK_USER with user_metadata (needed by this route)
const MOCK_USER = {
  id: "user-1",
  email: "a@b.com",
  user_metadata: { full_name: "Test User" },
};

function makeReq(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/postings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      body ?? { description: "Test posting", title: "Test" },
    ),
  });
}

const routeCtx = { params: Promise.resolve({}) };

describe("POST /api/postings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await POST(makeReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 400 when description is missing", async () => {
    authedUser(mockGetUser, MOCK_USER);
    const res = await POST(makeReq({ title: "No desc" }), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("creates a posting successfully", async () => {
    authedUser(mockGetUser, MOCK_USER);

    const profileChain = buildChain({
      data: { user_id: "user-1" },
      error: null,
    });
    const postingChain = buildChain({
      data: { id: "posting-1", title: "Test" },
      error: null,
    });
    const skillsChain = buildChain({ data: null, error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return profileChain; // profile check
      if (callCount === 2) return postingChain; // insert posting
      return skillsChain; // posting_skills, windows
    });

    const res = await POST(
      makeReq({
        title: "Test Posting",
        description: "A test description",
        selectedSkills: [{ skillId: "s1", levelMin: 2 }],
      }),
      routeCtx,
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.posting).toBeDefined();
  });

  it("auto-generates title from description", async () => {
    authedUser(mockGetUser, MOCK_USER);

    const profileChain = buildChain({
      data: { user_id: "user-1" },
      error: null,
    });
    const postingChain = buildChain({
      data: { id: "posting-1", title: "A test description" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return profileChain;
      return postingChain;
    });

    const res = await POST(
      makeReq({ description: "A test description. More details." }),
      routeCtx,
    );
    expect(res.status).toBe(201);
  });

  it("creates minimal profile if none exists", async () => {
    authedUser(mockGetUser, MOCK_USER);

    const noProfileChain = buildChain({
      data: null,
      error: { code: "PGRST116", message: "not found" },
    });
    const insertProfileChain = buildChain({ data: null, error: null });
    const postingChain = buildChain({
      data: { id: "posting-1", title: "Test" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return noProfileChain;
      if (callCount === 2) return insertProfileChain;
      return postingChain;
    });

    const res = await POST(
      makeReq({ description: "Test", title: "Test" }),
      routeCtx,
    );
    expect(res.status).toBe(201);
  });

  it("maps PG error 23503 to user-friendly message", async () => {
    authedUser(mockGetUser, MOCK_USER);

    const profileChain = buildChain({
      data: { user_id: "user-1" },
      error: null,
    });
    const postingChain = buildChain({
      data: null,
      error: { code: "23503", message: "FK violation" },
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return profileChain;
      return postingChain;
    });

    const res = await POST(
      makeReq({ description: "Test", title: "Test" }),
      routeCtx,
    );

    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("maps PG error 23505 to conflict", async () => {
    authedUser(mockGetUser, MOCK_USER);

    const profileChain = buildChain({
      data: { user_id: "user-1" },
      error: null,
    });
    const postingChain = buildChain({
      data: null,
      error: { code: "23505", message: "Duplicate" },
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return profileChain;
      return postingChain;
    });

    const res = await POST(
      makeReq({ description: "Test", title: "Test" }),
      routeCtx,
    );

    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("triggers embedding generation after creation", async () => {
    authedUser(mockGetUser, MOCK_USER);

    const profileChain = buildChain({
      data: { user_id: "user-1" },
      error: null,
    });
    const postingChain = buildChain({
      data: { id: "posting-1", title: "Test" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return profileChain;
      return postingChain;
    });

    await POST(makeReq({ description: "Test", title: "Test" }), routeCtx);

    const { triggerEmbeddingGenerationServer } =
      await import("@/lib/api/trigger-embedding-server");
    expect(triggerEmbeddingGenerationServer).toHaveBeenCalled();
  });
});
