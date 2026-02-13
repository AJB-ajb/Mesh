// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// Build a chainable Supabase query mock
function buildChain(data: unknown, error: unknown = null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data, error });
  chain.update = vi.fn().mockReturnValue(chain);
  return chain;
}

// Dynamic import to work around [id] path issues
const { PATCH } = await import("@/app/api/postings/[id]/reactivate/route");

describe("PATCH /api/postings/[id]/reactivate", () => {
  const mockUser = { id: "user-1", email: "test@example.com" };
  const req = new Request(
    "http://localhost/api/postings/posting-1/reactivate",
    {
      method: "PATCH",
    },
  );
  const routeContext = { params: Promise.resolve({ id: "posting-1" }) };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const res = await PATCH(req, routeContext);
    expect(res.status).toBe(401);
  });

  it("returns 404 when posting not found", async () => {
    const chain = buildChain(null, { message: "not found" });
    mockFrom.mockReturnValue(chain);

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 403 when user is not the creator", async () => {
    const fetchChain = buildChain({
      id: "posting-1",
      creator_id: "other-user",
      status: "open",
      expires_at: new Date(Date.now() - 86400000).toISOString(),
    });
    mockFrom.mockReturnValue(fetchChain);

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("returns 400 when posting is not expired", async () => {
    const fetchChain = buildChain({
      id: "posting-1",
      creator_id: "user-1",
      status: "open",
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    mockFrom.mockReturnValue(fetchChain);

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("reactivates an expired posting successfully", async () => {
    const expiredPosting = {
      id: "posting-1",
      creator_id: "user-1",
      status: "open",
      expires_at: new Date(Date.now() - 86400000).toISOString(),
    };

    const updatedPosting = {
      ...expiredPosting,
      status: "open",
      expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain(expiredPosting);
      return buildChain(updatedPosting);
    });

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.posting).toBeDefined();
    expect(body.posting.status).toBe("open");
  });

  it("reactivates a posting with status 'expired'", async () => {
    const expiredPosting = {
      id: "posting-1",
      creator_id: "user-1",
      status: "expired",
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    };

    const updatedPosting = {
      ...expiredPosting,
      status: "open",
      expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain(expiredPosting);
      return buildChain(updatedPosting);
    });

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.posting.status).toBe("open");
  });

  it("returns 500 when update fails", async () => {
    const expiredPosting = {
      id: "posting-1",
      creator_id: "user-1",
      status: "expired",
      expires_at: new Date(Date.now() - 86400000).toISOString(),
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return buildChain(expiredPosting);
      return buildChain(null, { message: "update failed" });
    });

    const res = await PATCH(req, routeContext);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
  });
});
