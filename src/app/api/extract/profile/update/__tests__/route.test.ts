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
  return new Request("http://localhost/api/extract/profile/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/extract/profile/update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsGeminiConfigured.mockReturnValue(true);
  });

  it("returns 503 when Gemini is not configured", async () => {
    mockIsGeminiConfigured.mockReturnValue(false);
    const res = await POST(
      makeReq({
        sourceText: "some profile text",
        updateInstruction: "add Python",
      }),
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
        sourceText: "some profile text",
        updateInstruction: "add Python",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when sourceText is missing", async () => {
    authedUser();
    const res = await POST(makeReq({ updateInstruction: "add Python" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("source text");
  });

  it("returns 400 when sourceText is too short", async () => {
    authedUser();
    const res = await POST(
      makeReq({ sourceText: "hi", updateInstruction: "add Python" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when updateInstruction is missing", async () => {
    authedUser();
    const res = await POST(makeReq({ sourceText: "some profile text here" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("update instruction");
  });

  it("returns 400 when updateInstruction is too short", async () => {
    authedUser();
    const res = await POST(
      makeReq({
        sourceText: "some profile text here",
        updateInstruction: "ab",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("updates and extracts profile successfully", async () => {
    authedUser();
    const result = {
      updated_text: "I know React, Node.js, and Python",
      skills: ["React", "Node.js", "Python"],
      bio: "Full-stack developer",
      skill_levels: '{"programming": 7}',
    };
    mockGenerateStructuredJSON.mockResolvedValue(result);

    const res = await POST(
      makeReq({
        sourceText: "I know React and Node.js",
        updateInstruction: "add Python to my skills",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.updatedSourceText).toBe("I know React, Node.js, and Python");
    expect(body.extractedProfile.skills).toEqual([
      "React",
      "Node.js",
      "Python",
    ]);
    // skill_levels should be parsed from JSON string to object
    expect(body.extractedProfile.skill_levels).toEqual({ programming: 7 });
  });

  it("handles unparseable skill_levels gracefully", async () => {
    authedUser();
    const result = {
      updated_text: "Updated text",
      skills: ["React"],
      skill_levels: "not-valid-json",
    };
    mockGenerateStructuredJSON.mockResolvedValue(result);

    const res = await POST(
      makeReq({
        sourceText: "some profile text here",
        updateInstruction: "update skills",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.extractedProfile.skill_levels).toBe("not-valid-json");
  });

  it("returns 500 when Gemini throws an error", async () => {
    authedUser();
    mockGenerateStructuredJSON.mockRejectedValue(new Error("Gemini API error"));

    const res = await POST(
      makeReq({
        sourceText: "some profile text here",
        updateInstruction: "add Python",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Gemini API error");
  });
});
