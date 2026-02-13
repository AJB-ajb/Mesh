// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase client
const mockFrom = vi.fn();
const mockCreateClient = vi.fn(() => ({
  from: mockFrom,
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => mockCreateClient(),
}));

// Mock embeddings
const mockGenerateEmbeddingsBatch = vi.fn();
vi.mock("@/lib/ai/embeddings", () => ({
  generateEmbeddingsBatch: (...args: unknown[]) =>
    mockGenerateEmbeddingsBatch(...args),
  composeProfileText: (
    bio: string | null,
    skills: string[] | null,
    interests: string[] | null,
    headline: string | null,
  ) => {
    const parts: string[] = [];
    if (headline) parts.push(`Headline: ${headline}`);
    if (bio) parts.push(`About: ${bio}`);
    if (skills && skills.length > 0) parts.push(`Skills: ${skills.join(", ")}`);
    if (interests && interests.length > 0)
      parts.push(`Interests: ${interests.join(", ")}`);
    return parts.join("\n\n");
  },
  composePostingText: (
    title: string,
    description: string,
    skills: string[] | null,
  ) => {
    const parts: string[] = [];
    parts.push(`Title: ${title}`);
    parts.push(`Description: ${description}`);
    if (skills && skills.length > 0)
      parts.push(`Required Skills: ${skills.join(", ")}`);
    return parts.join("\n\n");
  },
}));

import { POST } from "../route";

// Helper to build chainable Supabase query mock
function mockQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
  };
  return chain;
}

function mockUpdateQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

function makeRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/embeddings/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

describe("POST /api/embeddings/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-service-key");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 without auth header or internal call header", async () => {
    const req = makeRequest();
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 with invalid bearer token", async () => {
    const req = makeRequest({ authorization: "Bearer wrong-key" });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("allows internal calls with x-internal-call header", async () => {
    const profilesQuery = mockQuery({ data: [], error: null });
    const postingsQuery = mockQuery({ data: [], error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? profilesQuery : postingsQuery;
    });

    const req = makeRequest({ "x-internal-call": "true" });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed).toEqual({ profiles: 0, postings: 0 });
  });

  it("allows calls with valid service role key", async () => {
    const profilesQuery = mockQuery({ data: [], error: null });
    const postingsQuery = mockQuery({ data: [], error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? profilesQuery : postingsQuery;
    });

    const req = makeRequest({
      authorization: "Bearer test-service-key",
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed).toEqual({ profiles: 0, postings: 0 });
  });

  it("returns empty result when no pending items", async () => {
    const profilesQuery = mockQuery({ data: [], error: null });
    const postingsQuery = mockQuery({ data: [], error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? profilesQuery : postingsQuery;
    });

    const req = makeRequest({ "x-internal-call": "true" });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed).toEqual({ profiles: 0, postings: 0 });
    expect(body.errors).toEqual([]);
  });

  it("processes pending profiles and postings", async () => {
    const pendingProfiles = [
      {
        user_id: "user-1",
        bio: "Developer bio",
        skills: ["TypeScript"],
        interests: null,
        headline: "Dev",
      },
    ];

    const pendingPostings = [
      {
        id: "posting-1",
        title: "Project",
        description: "A cool project",
        skills: ["React"],
      },
    ];

    const profilesQuery = mockQuery({ data: pendingProfiles, error: null });
    const postingsQuery = mockQuery({ data: pendingPostings, error: null });

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);
      if (
        table === "profiles" &&
        calls.filter((c) => c === "profiles").length === 1
      ) {
        return profilesQuery;
      }
      if (
        table === "postings" &&
        calls.filter((c) => c === "postings").length === 1
      ) {
        return postingsQuery;
      }
      // Update calls
      return mockUpdateQuery({ data: null, error: null });
    });

    const mockEmbeddings = [
      new Array(1536).fill(0.1),
      new Array(1536).fill(0.2),
    ];
    mockGenerateEmbeddingsBatch.mockResolvedValueOnce(mockEmbeddings);

    const req = makeRequest({ "x-internal-call": "true" });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed.profiles).toBe(1);
    expect(body.processed.postings).toBe(1);
    expect(mockGenerateEmbeddingsBatch).toHaveBeenCalledTimes(1);
    // Should have been called with 2 texts (1 profile + 1 posting)
    expect(mockGenerateEmbeddingsBatch.mock.calls[0][0]).toHaveLength(2);
  });

  it("returns error when embedding generation fails", async () => {
    const pendingProfiles = [
      {
        user_id: "user-1",
        bio: "Developer bio",
        skills: ["TypeScript"],
        interests: null,
        headline: "Dev",
      },
    ];

    const profilesQuery = mockQuery({ data: pendingProfiles, error: null });
    const postingsQuery = mockQuery({ data: [], error: null });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      return callCount === 1 ? profilesQuery : postingsQuery;
    });

    // Must reject on all retry attempts (initial + 2 retries)
    mockGenerateEmbeddingsBatch.mockRejectedValue(
      new Error("OpenAI API error: 500"),
    );

    const req = makeRequest({ "x-internal-call": "true" });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.message).toContain("Embedding generation failed");
  });

  it("skips profiles with no embeddable content", async () => {
    const pendingProfiles = [
      {
        user_id: "user-empty",
        bio: null,
        skills: null,
        interests: null,
        headline: null,
      },
    ];

    const profilesQuery = mockQuery({ data: pendingProfiles, error: null });
    const postingsQuery = mockQuery({ data: [], error: null });

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);
      if (
        table === "profiles" &&
        calls.filter((c) => c === "profiles").length === 1
      ) {
        return profilesQuery;
      }
      if (
        table === "postings" &&
        calls.filter((c) => c === "postings").length === 1
      ) {
        return postingsQuery;
      }
      // Update call for skipped profile
      return mockUpdateQuery({ data: null, error: null });
    });

    const req = makeRequest({ "x-internal-call": "true" });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed.profiles).toBe(0);
    expect(body.skipped.profiles).toBe(1);
    expect(mockGenerateEmbeddingsBatch).not.toHaveBeenCalled();
  });

  it("reports database errors without failing entire batch", async () => {
    const pendingProfiles = [
      {
        user_id: "user-1",
        bio: "Bio",
        skills: null,
        interests: null,
        headline: "Headline",
      },
    ];

    const profilesQuery = mockQuery({ data: pendingProfiles, error: null });
    const postingsQuery = mockQuery({ data: [], error: null });

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);
      if (
        table === "profiles" &&
        calls.filter((c) => c === "profiles").length === 1
      ) {
        return profilesQuery;
      }
      if (
        table === "postings" &&
        calls.filter((c) => c === "postings").length === 1
      ) {
        return postingsQuery;
      }
      // Update call fails
      return mockUpdateQuery({
        data: null,
        error: { message: "Database error" },
      });
    });

    mockGenerateEmbeddingsBatch.mockResolvedValueOnce([
      new Array(1536).fill(0.1),
    ]);

    const req = makeRequest({ "x-internal-call": "true" });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed.profiles).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("Database error");
  });
});
