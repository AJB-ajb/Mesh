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
  return new Request("http://localhost/api/extract/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/extract/profile", () => {
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

  it("extracts profile successfully", async () => {
    authedUser();
    const extracted = {
      full_name: "Jane Doe",
      skills: ["React", "Node.js"],
      bio: "Full-stack developer",
    };
    mockGenerateStructuredJSON.mockResolvedValue(extracted);

    const res = await POST(
      makeReq({
        text: "I'm Jane Doe, a full-stack developer with React and Node.js experience",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.profile).toEqual(extracted);
  });

  it("returns 500 when Gemini throws an error", async () => {
    authedUser();
    mockGenerateStructuredJSON.mockRejectedValue(new Error("API error"));

    const res = await POST(
      makeReq({ text: "Some valid profile text for extraction" }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("API error");
  });
});
