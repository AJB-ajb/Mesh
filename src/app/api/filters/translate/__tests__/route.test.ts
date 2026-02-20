// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

// ---------- Gemini mock ----------
const mockGenerateStructuredJSON = vi.fn();
const mockIsGeminiConfigured = vi.fn();

vi.mock("@/lib/ai/gemini", () => ({
  generateStructuredJSON: (...args: unknown[]) =>
    mockGenerateStructuredJSON(...args),
  isGeminiConfigured: () => mockIsGeminiConfigured(),
}));

// Import after mocking
import { POST } from "../route";

const MOCK_USER = { id: "user-1", email: "a@b.com" };

function makeReq(body: unknown) {
  return new Request("http://localhost/api/filters/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authedUser() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
}

describe("POST /api/filters/translate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsGeminiConfigured.mockReturnValue(true);
  });

  it("returns 503 when Gemini is not configured", async () => {
    mockIsGeminiConfigured.mockReturnValue(false);
    authedUser();

    const res = await POST(makeReq({ query: "remote React" }));
    expect(res.status).toBe(503);

    const body = await res.json();
    expect(body.error.message).toContain("Gemini");
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No session" },
    });

    const res = await POST(makeReq({ query: "remote React" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when query is missing", async () => {
    authedUser();

    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.error.message).toContain("query");
  });

  it("returns 400 when query is empty string", async () => {
    authedUser();

    const res = await POST(makeReq({ query: "   " }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when query is not a string", async () => {
    authedUser();

    const res = await POST(makeReq({ query: 123 }));
    expect(res.status).toBe(400);
  });

  it("returns structured filters on successful translation", async () => {
    authedUser();
    const expectedFilters = {
      location_mode: "remote",
      skills: ["React", "TypeScript"],
      hours_per_week_min: 10,
    };
    mockGenerateStructuredJSON.mockResolvedValue(expectedFilters);

    const res = await POST(
      makeReq({ query: "remote React TypeScript, 10+ hours/week" }),
    );
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.filters).toEqual(expectedFilters);
  });

  it("calls generateStructuredJSON with correct parameters", async () => {
    authedUser();
    mockGenerateStructuredJSON.mockResolvedValue({});

    await POST(makeReq({ query: "remote only" }));

    expect(mockGenerateStructuredJSON).toHaveBeenCalledOnce();
    const callArgs = mockGenerateStructuredJSON.mock.calls[0][0];
    expect(callArgs.temperature).toBe(0.3);
    expect(callArgs.userPrompt).toContain("remote only");
    expect(callArgs.systemPrompt).toBeDefined();
    expect(callArgs.schema).toBeDefined();
  });

  it("returns 500 when Gemini call fails", async () => {
    authedUser();
    mockGenerateStructuredJSON.mockRejectedValue(new Error("API error"));

    const res = await POST(makeReq({ query: "remote React" }));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error.message).toBe("API error");
  });
});
