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

const { GET } = await import("@/app/api/postings/[id]/hidden-details/route");

const MOCK_USER = { id: "user-1", email: "a@b.com" };

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

function buildChain(resolveValue: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue(resolveValue);
  chain.maybeSingle = vi.fn().mockResolvedValue(resolveValue);
  return chain;
}

function makeGetReq() {
  return new Request("http://localhost/api/postings/posting-1/hidden-details", {
    method: "GET",
  });
}

const routeCtx = { params: Promise.resolve({ id: "posting-1" }) };

describe("GET /api/postings/[id]/hidden-details", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 for unauthenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await GET(makeGetReq(), routeCtx);
    expect(res.status).toBe(401);
  });

  it("returns 404 for non-existent posting", async () => {
    authedUser();
    mockFrom.mockReturnValue(
      buildChain({ data: null, error: { message: "not found" } }),
    );

    const res = await GET(makeGetReq(), routeCtx);
    expect(res.status).toBe(404);
  });

  it("returns hidden_details for posting owner", async () => {
    authedUser();

    const postingChain = buildChain({
      data: {
        id: "posting-1",
        creator_id: "user-1",
        hidden_details: "Secret meeting room 42",
      },
      error: null,
    });

    mockFrom.mockReturnValue(postingChain);

    const res = await GET(makeGetReq(), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.hidden_details).toBe("Secret meeting room 42");
  });

  it("returns hidden_details for accepted applicant", async () => {
    authedUser();

    const postingChain = buildChain({
      data: {
        id: "posting-1",
        creator_id: "other-user",
        hidden_details: "Discord link: discord.gg/abc",
      },
      error: null,
    });

    const applicationChain = buildChain({
      data: { id: "app-1", status: "accepted" },
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return postingChain;
      return applicationChain;
    });

    const res = await GET(makeGetReq(), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.hidden_details).toBe("Discord link: discord.gg/abc");
  });

  it("returns 403 for non-accepted user", async () => {
    authedUser();

    const postingChain = buildChain({
      data: {
        id: "posting-1",
        creator_id: "other-user",
        hidden_details: "Secret stuff",
      },
      error: null,
    });

    const applicationChain = buildChain({
      data: null,
      error: null,
    });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return postingChain;
      return applicationChain;
    });

    const res = await GET(makeGetReq(), routeCtx);
    expect(res.status).toBe(403);
  });

  it("returns null hidden_details when field is empty", async () => {
    authedUser();

    const postingChain = buildChain({
      data: {
        id: "posting-1",
        creator_id: "user-1",
        hidden_details: null,
      },
      error: null,
    });

    mockFrom.mockReturnValue(postingChain);

    const res = await GET(makeGetReq(), routeCtx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.hidden_details).toBeNull();
  });
});
