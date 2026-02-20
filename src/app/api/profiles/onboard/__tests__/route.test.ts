// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser, updateUser: mockUpdateUser },
    from: mockFrom,
  })),
}));

const { POST } = await import("@/app/api/profiles/onboard/route");

const MOCK_USER = { id: "user-1", email: "a@b.com" };

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

function buildChain(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockResolvedValue(resolveValue);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(resolveValue);
  return chain;
}

function makeReq(body?: Record<string, unknown>) {
  return new Request("http://localhost/api/profiles/onboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : JSON.stringify({}),
  });
}

const routeCtx = { params: Promise.resolve({}) };

describe("POST /api/profiles/onboard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await POST(makeReq({}), routeCtx);
    expect(res.status).toBe(401);
  });

  it("creates profile and marks profile_completed on success", async () => {
    authedUser();
    mockFrom.mockReturnValue(buildChain({ data: null, error: null }));
    mockUpdateUser.mockResolvedValue({ error: null });

    const res = await POST(
      makeReq({
        fullName: "Test User",
        headline: "Developer",
        bio: "Hello",
        skills: "react, node",
        interests: "web",
        languages: "English",
      }),
      routeCtx,
    );

    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: { profile_completed: true },
    });
  });

  it("returns 500 when upsert fails", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "DB error" } }),
    );

    const res = await POST(makeReq({ fullName: "Test" }), routeCtx);
    expect(res.status).toBe(500);
  });

  it("trims whitespace from fields", async () => {
    authedUser();
    const chain = buildChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    mockUpdateUser.mockResolvedValue({ error: null });

    await POST(
      makeReq({
        fullName: "  Test User  ",
        headline: " Dev ",
      }),
      routeCtx,
    );

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: "Test User",
        headline: "Dev",
      }),
      { onConflict: "user_id" },
    );
  });

  it("parses comma-separated skills into array", async () => {
    authedUser();
    const chain = buildChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    mockUpdateUser.mockResolvedValue({ error: null });

    await POST(
      makeReq({
        skills: "react, node, ,typescript",
      }),
      routeCtx,
    );

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        skills: ["react", "node", "typescript"],
      }),
      { onConflict: "user_id" },
    );
  });

  it("handles missing optional fields gracefully", async () => {
    authedUser();
    const chain = buildChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    mockUpdateUser.mockResolvedValue({ error: null });

    const res = await POST(makeReq({}), routeCtx);
    expect(res.status).toBe(201);
  });
});
