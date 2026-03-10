// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase server client
const mockGetUser = vi.fn();
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  })),
}));

// Chain: insert().select().single()
mockInsert.mockReturnValue({ select: mockSelect });
mockSelect.mockReturnValue({ single: mockSingle });

import { POST } from "../route";

const routeCtx = { params: Promise.resolve({}) };

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to anonymous user (optional auth allows this)
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    // Reset chain defaults
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
  });

  it("returns 400 for missing message", async () => {
    const req = makeRequest({ page_url: "http://localhost/" });
    const res = await POST(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 400 for empty message", async () => {
    const req = makeRequest({ message: "   ", page_url: "http://localhost/" });
    const res = await POST(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 400 for missing page_url", async () => {
    const req = makeRequest({ message: "Some feedback" });
    const res = await POST(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 400 for invalid mood", async () => {
    const req = makeRequest({
      message: "Some feedback",
      page_url: "http://localhost/",
      mood: "angry",
    });
    const res = await POST(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.message).toContain("Invalid mood");
  });

  it("returns 201 with authenticated user", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { id: "fb-1", created_at: "2026-02-19T00:00:00Z" },
      error: null,
    });

    const req = makeRequest({
      message: "Great app!",
      mood: "happy",
      page_url: "http://localhost/dashboard",
      user_agent: "Mozilla/5.0",
    });
    const res = await POST(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe("fb-1");
    expect(body.created_at).toBeDefined();

    // Verify insert was called with user_id and new fields default to null
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        mood: "happy",
        screenshot_url: null,
        metadata: null,
      }),
    );
  });

  it("passes screenshot_url and metadata to insert", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { id: "fb-meta", created_at: "2026-03-06T00:00:00Z" },
      error: null,
    });

    const metadata = {
      viewport_width: 375,
      viewport_height: 812,
      platform: "iPhone",
    };
    const req = makeRequest({
      message: "Bug with screenshot",
      page_url: "http://localhost/postings",
      screenshot_url: "https://storage.example.com/shot.png",
      metadata,
    });
    const res = await POST(req, routeCtx);

    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        screenshot_url: "https://storage.example.com/shot.png",
        metadata,
      }),
    );
  });

  it("returns 201 with anonymous user (user_id null)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });
    mockSingle.mockResolvedValue({
      data: { id: "fb-2", created_at: "2026-02-19T00:00:00Z" },
      error: null,
    });

    const req = makeRequest({
      message: "Found a bug",
      page_url: "http://localhost/",
    });
    const res = await POST(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe("fb-2");

    // Verify insert was called with user_id: null
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: null }),
    );
  });

  it("returns 201 with mood omitted", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: { id: "fb-3", created_at: "2026-02-19T00:00:00Z" },
      error: null,
    });

    const req = makeRequest({
      message: "Just some feedback",
      page_url: "http://localhost/postings",
    });
    const res = await POST(req, routeCtx);

    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ mood: null }),
    );
  });

  describe("malformed payloads", () => {
    it("returns 400 when message is a number instead of string", async () => {
      const req = makeRequest({ message: 123, page_url: "http://x/" });
      const res = await POST(req, routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION");
    });

    it("returns 400 when page_url is a number", async () => {
      const req = makeRequest({ message: "ok", page_url: 123 });
      const res = await POST(req, routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION");
    });

    it("treats null mood as valid (omitted)", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-123" } },
        error: null,
      });
      mockSingle.mockResolvedValue({
        data: { id: "fb-m", created_at: "2026-03-06T00:00:00Z" },
        error: null,
      });

      const req = makeRequest({
        message: "ok",
        page_url: "http://x/",
        mood: null,
      });
      const res = await POST(req, routeCtx);

      expect(res.status).toBe(201);
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ mood: null }),
      );
    });

    it("returns 400 for extra-long message (> 5000 chars)", async () => {
      const req = makeRequest({
        message: "a".repeat(5001),
        page_url: "http://x/",
      });
      const res = await POST(req, routeCtx);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe("VALIDATION");
      expect(body.error.message).toContain("5000");
    });
  });

  it("returns 500 on insert failure", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "Database error", code: "42P01" },
    });

    const req = makeRequest({
      message: "Feedback that fails",
      page_url: "http://localhost/",
    });
    const res = await POST(req, routeCtx);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
  });
});
