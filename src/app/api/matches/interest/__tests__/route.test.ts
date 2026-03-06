// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildChain, mockTables } from "tests/utils/supabase-mock";

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
    mockTables(mockFrom, {
      postings: buildChain({
        data: null,
        error: { message: "Not found" },
      }),
    });

    const req = makeRequest({ posting_id: "nonexistent-posting" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 400 when posting is private", async () => {
    mockTables(mockFrom, {
      postings: buildChain({
        data: {
          id: "posting-1",
          creator_id: "other-user",
          mode: "friend_ask",
          visibility: "private",
          status: "open",
        },
        error: null,
      }),
    });

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("public");
  });

  it("returns 400 when user tries to express interest in own posting", async () => {
    mockTables(mockFrom, {
      postings: buildChain({
        data: {
          id: "posting-1",
          creator_id: "user-123",
          mode: "open",
          status: "open",
        },
        error: null,
      }),
    });

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("own posting");
  });

  it("returns 409 when user already expressed interest", async () => {
    mockTables(mockFrom, {
      postings: buildChain({
        data: {
          id: "posting-1",
          creator_id: "other-user",
          mode: "open",
          status: "open",
        },
        error: null,
      }),
      matches: buildChain({
        data: { id: "match-1", status: "interested" },
        error: null,
      }),
    });

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("creates interest successfully", async () => {
    const createdMatch = {
      id: "match-new",
      posting_id: "posting-1",
      user_id: "user-123",
      similarity_score: 0,
      status: "interested",
      created_at: "2026-01-01T00:00:00Z",
    };

    mockTables(mockFrom, {
      postings: buildChain({
        data: {
          id: "posting-1",
          creator_id: "other-user",
          mode: "open",
          status: "open",
        },
        error: null,
      }),
      matches: [
        buildChain({
          data: null,
          error: { code: "PGRST116" }, // "not found" error from .single()
        }),
        buildChain({
          data: createdMatch,
          error: null,
        }),
      ],
    });

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.match).toEqual(createdMatch);
  });

  it("returns 400 when posting is no longer open status", async () => {
    mockTables(mockFrom, {
      postings: buildChain({
        data: {
          id: "posting-1",
          creator_id: "other-user",
          mode: "open",
          status: "closed",
        },
        error: null,
      }),
    });

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("no longer open");
  });

  it("returns 500 when match insert fails", async () => {
    mockTables(mockFrom, {
      postings: buildChain({
        data: {
          id: "posting-1",
          creator_id: "other-user",
          mode: "open",
          status: "open",
        },
        error: null,
      }),
      matches: [
        buildChain({
          data: null,
          error: { code: "PGRST116" }, // no existing match
        }),
        buildChain({
          data: null,
          error: { message: "insert failed" }, // insert error
        }),
      ],
    });

    const req = makeRequest({ posting_id: "posting-1" });
    const response = await POST(req, { params: Promise.resolve({}) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
  });
});
