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
    // Reset chain defaults
    mockInsert.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ single: mockSingle });
  });

  it("returns 400 for missing message", async () => {
    const req = makeRequest({ page_url: "http://localhost/" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 400 for empty message", async () => {
    const req = makeRequest({ message: "   ", page_url: "http://localhost/" });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("returns 400 for missing page_url", async () => {
    const req = makeRequest({ message: "Some feedback" });
    const res = await POST(req);
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
    const res = await POST(req);
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
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.id).toBe("fb-1");
    expect(body.created_at).toBeDefined();

    // Verify insert was called with user_id
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "user-123", mood: "happy" }),
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
    const res = await POST(req);
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
    const res = await POST(req);

    expect(res.status).toBe(201);
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ mood: null }),
    );
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
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe("INTERNAL");
  });
});
