// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Mocks ----------
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const mockGenerateStructuredJSON = vi.fn();
const mockIsGeminiConfigured = vi.fn();

vi.mock("@/lib/ai/gemini", () => ({
  generateStructuredJSON: (...args: unknown[]) =>
    mockGenerateStructuredJSON(...args),
  isGeminiConfigured: () => mockIsGeminiConfigured(),
}));

import { POST } from "../route";

const MOCK_USER = { id: "user-1", email: "a@b.com" };
const routeCtx = { params: Promise.resolve({}) };

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

function makeReq(body: unknown) {
  return new Request("http://localhost/api/extract/posting/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockPostingOwned() {
  const mockSingle = vi.fn().mockResolvedValue({
    data: {
      creator_id: MOCK_USER.id,
      title: "My Posting",
      description: "A posting",
      category: "personal",
      estimated_time: "2 weeks",
      team_size_max: 5,
      tags: ["test"],
      context_identifier: null,
      mode: "open",
    },
    error: null,
  });
  const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
}

describe("POST /api/extract/posting/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsGeminiConfigured.mockReturnValue(true);
  });

  it("returns 503 when Gemini is not configured", async () => {
    mockIsGeminiConfigured.mockReturnValue(false);
    authedUser();
    const res = await POST(
      makeReq({
        postingId: "p1",
        sourceText: "some text",
        updateInstruction: "add Python",
      }),
      routeCtx,
    );
    expect(res.status).toBe(503);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await POST(
      makeReq({
        postingId: "p1",
        sourceText: "some text",
        updateInstruction: "add Python",
      }),
      routeCtx,
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when postingId is missing", async () => {
    authedUser();
    const res = await POST(
      makeReq({ updateInstruction: "add Python" }),
      routeCtx,
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when updateInstruction is missing", async () => {
    authedUser();
    const res = await POST(
      makeReq({ postingId: "p1", sourceText: "some text" }),
      routeCtx,
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when posting is not found", async () => {
    authedUser();
    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const res = await POST(
      makeReq({
        postingId: "p-nonexistent",
        sourceText: "some text",
        updateInstruction: "add Python",
      }),
      routeCtx,
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not the owner", async () => {
    authedUser();
    const mockSingle = vi.fn().mockResolvedValue({
      data: { creator_id: "other-user", title: "T" },
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect });

    const res = await POST(
      makeReq({
        postingId: "p1",
        sourceText: "some text",
        updateInstruction: "add Python",
      }),
      routeCtx,
    );
    expect(res.status).toBe(403);
  });

  it("updates and extracts posting successfully", async () => {
    authedUser();
    mockPostingOwned();

    const result = {
      updated_text: "Updated posting about React and Python",
      title: "My Posting",
      description: "Updated description",
      skills: ["React", "Python"],
      category: "personal",
    };
    mockGenerateStructuredJSON.mockResolvedValue(result);

    const res = await POST(
      makeReq({
        postingId: "p1",
        sourceText: "A posting about React",
        updateInstruction: "add Python to required skills",
      }),
      routeCtx,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.updatedSourceText).toBe(
      "Updated posting about React and Python",
    );
    expect(body.extractedPosting.skills).toEqual(["React", "Python"]);
  });

  it("returns 500 when Gemini throws an error", async () => {
    authedUser();
    mockPostingOwned();
    mockGenerateStructuredJSON.mockRejectedValue(new Error("Gemini failed"));

    const res = await POST(
      makeReq({
        postingId: "p1",
        sourceText: "some text",
        updateInstruction: "add Python",
      }),
      routeCtx,
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.message).toContain("Gemini failed");
  });
});
