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

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

function makeReq(body: unknown) {
  return new Request("http://localhost/api/extract/posting", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/extract/posting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsGeminiConfigured.mockReturnValue(true);
  });

  it("returns 503 when Gemini is not configured", async () => {
    mockIsGeminiConfigured.mockReturnValue(false);
    const res = await POST(makeReq({ text: "some text here for testing" }));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("Gemini");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await POST(makeReq({ text: "some text here for testing" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when text is missing", async () => {
    authedUser();
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is too short", async () => {
    authedUser();
    const res = await POST(makeReq({ text: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when text is not a string", async () => {
    authedUser();
    const res = await POST(makeReq({ text: 12345 }));
    expect(res.status).toBe(400);
  });

  it("extracts posting successfully", async () => {
    authedUser();
    const extracted = {
      title: "Build a React App",
      description: "Looking for collaborators on a React project",
      skills: ["React", "TypeScript"],
    };
    mockGenerateStructuredJSON.mockResolvedValue(extracted);

    const res = await POST(
      makeReq({ text: "I want to build a React app with TypeScript" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.posting).toEqual(extracted);
    expect(mockGenerateStructuredJSON).toHaveBeenCalledOnce();
  });

  it("returns 500 when Gemini throws an error", async () => {
    authedUser();
    mockGenerateStructuredJSON.mockRejectedValue(new Error("Gemini failed"));

    const res = await POST(
      makeReq({ text: "I want to build a React app with TypeScript" }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Gemini failed");
  });
});
