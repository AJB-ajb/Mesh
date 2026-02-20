// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { GET } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(query: string): Request {
  return new Request(`http://localhost/api/profiles/search?q=${encodeURIComponent(query)}`);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/profiles/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Unauthorized" },
    });

    const req = makeRequest("Alice");
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(401);
  });

  it("returns 400 when query is too short", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const req = makeRequest("A");
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 400 when query is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const req = new Request("http://localhost/api/profiles/search");
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(400);
  });

  it("returns empty array when no profiles match", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    const profileChain = {
      select: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    mockFrom.mockReturnValue(profileChain);

    const req = makeRequest("Nobody");
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profiles).toEqual([]);
  });

  it("returns profiles with connection status", async () => {
    const mockUser = { id: "user-1" };
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const profilesData = [
      { user_id: "user-2", full_name: "Alice Smith", headline: "Developer" },
      { user_id: "user-3", full_name: "Alice Jones", headline: "Designer" },
    ];

    const friendshipsData = [
      { id: "f-1", user_id: "user-1", friend_id: "user-2", status: "accepted" },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: profilesData, error: null }),
        };
      }
      // friendships
      return {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: friendshipsData, error: null }),
      };
    });

    const req = makeRequest("Alice");
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profiles).toHaveLength(2);

    const alice = body.profiles.find((p: { user_id: string }) => p.user_id === "user-2");
    expect(alice?.connectionStatus).toBe("accepted");

    const jones = body.profiles.find((p: { user_id: string }) => p.user_id === "user-3");
    expect(jones?.connectionStatus).toBe("none");
  });

  it("correctly identifies pending_sent status", async () => {
    const mockUser = { id: "user-1" };
    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const profilesData = [
      { user_id: "user-2", full_name: "Bob Test", headline: null },
    ];

    const friendshipsData = [
      { id: "f-1", user_id: "user-1", friend_id: "user-2", status: "pending" },
    ];

    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: profilesData, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({ data: friendshipsData, error: null }),
      };
    });

    const req = makeRequest("Bob");
    const res = await GET(req, { params: Promise.resolve({}) });
    const body = await res.json();
    expect(body.profiles[0].connectionStatus).toBe("pending_sent");
  });
});
