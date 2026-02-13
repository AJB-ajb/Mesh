// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase server client
const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

import { POST } from "../route";

// Helper to build chainable Supabase query mock
function mockQuery(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/matches/interest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockUser = { id: "user-123", email: "test@example.com" };

describe("POST /api/matches/interest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 when posting_id is missing", async () => {
    const req = makeRequest({});
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.message).toBe("posting_id is required");
  });

  it("returns 404 when posting does not exist", async () => {
    const postingQuery = mockQuery({
      data: null,
      error: { message: "Not found" },
    });
    mockFrom.mockReturnValue(postingQuery);

    const req = makeRequest({ posting_id: "nonexistent-posting" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 when posting is not open mode", async () => {
    // First call: fetch posting — returns friend_ask mode
    const postingQuery = mockQuery({
      data: {
        id: "posting-1",
        creator_id: "other-user",
        mode: "friend_ask",
        status: "open",
      },
      error: null,
    });
    mockFrom.mockReturnValue(postingQuery);

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("open-mode");
  });

  it("returns 400 when user tries to express interest in own posting", async () => {
    const postingQuery = mockQuery({
      data: {
        id: "posting-1",
        creator_id: "user-123",
        mode: "open",
        status: "open",
      },
      error: null,
    });
    mockFrom.mockReturnValue(postingQuery);

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("own posting");
  });

  it("returns 409 when user already expressed interest", async () => {
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: fetch posting
        return mockQuery({
          data: {
            id: "posting-1",
            creator_id: "other-user",
            mode: "open",
            status: "open",
          },
          error: null,
        });
      }
      // Second call: check existing match
      return mockQuery({
        data: { id: "match-1", status: "interested" },
        error: null,
      });
    });

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("creates interest successfully", async () => {
    let callCount = 0;
    const createdMatch = {
      id: "match-new",
      posting_id: "posting-1",
      user_id: "user-123",
      similarity_score: 0,
      status: "interested",
      created_at: "2026-01-01T00:00:00Z",
    };

    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: fetch posting
        return mockQuery({
          data: {
            id: "posting-1",
            creator_id: "other-user",
            mode: "open",
            status: "open",
          },
          error: null,
        });
      }
      if (callCount === 2) {
        // Second call: check existing match (none found)
        return mockQuery({
          data: null,
          error: { code: "PGRST116" }, // "not found" error from .single()
        });
      }
      // Third call: insert match
      return mockQuery({
        data: createdMatch,
        error: null,
      });
    });

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.match).toEqual(createdMatch);
  });

  it("returns 400 when posting is no longer open status", async () => {
    const postingQuery = mockQuery({
      data: {
        id: "posting-1",
        creator_id: "other-user",
        mode: "open",
        status: "closed",
      },
      error: null,
    });
    mockFrom.mockReturnValue(postingQuery);

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("no longer open");
  });
});
