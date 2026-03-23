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

// Mock supabase server client (used by withAuth cron mode)
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: vi.fn() },
  })),
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

const routeContext = { params: Promise.resolve({}) };

describe("POST /api/embeddings/process", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SECRET_KEY", "test-service-key");
    vi.stubEnv("EMBEDDINGS_API_KEY", "test-embeddings-key");
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 without auth header", async () => {
    const req = makeRequest();
    const response = await POST(req, routeContext);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 with invalid bearer token", async () => {
    const req = makeRequest({ authorization: "Bearer wrong-key" });
    const response = await POST(req, routeContext);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("allows calls with valid EMBEDDINGS_API_KEY", async () => {
    const profilesQuery = mockQuery({ data: [], error: null });

    mockFrom.mockImplementation(() => profilesQuery);

    const req = makeRequest({ authorization: "Bearer test-embeddings-key" });
    const response = await POST(req, routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed).toEqual({ profiles: 0 });
  });

  it("rejects calls with service role key (only EMBEDDINGS_API_KEY is accepted)", async () => {
    const req = makeRequest({
      authorization: "Bearer test-service-key",
    });
    const response = await POST(req, routeContext);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns empty result when no pending items", async () => {
    const profilesQuery = mockQuery({ data: [], error: null });

    mockFrom.mockImplementation(() => profilesQuery);

    const req = makeRequest({ authorization: "Bearer test-embeddings-key" });
    const response = await POST(req, routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed).toEqual({ profiles: 0 });
    expect(body.errors).toEqual([]);
  });

  it("processes pending profiles", async () => {
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

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);
      if (
        table === "profiles" &&
        calls.filter((c) => c === "profiles").length === 1
      ) {
        return profilesQuery;
      }
      // Update calls
      return mockUpdateQuery({ data: null, error: null });
    });

    const mockEmbeddings = [new Array(1536).fill(0.1)];
    mockGenerateEmbeddingsBatch.mockResolvedValueOnce(mockEmbeddings);

    const req = makeRequest({ authorization: "Bearer test-embeddings-key" });
    const response = await POST(req, routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed.profiles).toBe(1);
    expect(mockGenerateEmbeddingsBatch).toHaveBeenCalledTimes(1);
    expect(mockGenerateEmbeddingsBatch.mock.calls[0][0]).toHaveLength(1);
  });

  it("derives skills from join-table rows instead of old column", async () => {
    const pendingProfiles = [
      {
        user_id: "user-1",
        bio: "Developer bio",
        skills: ["OldSkill"],
        interests: null,
        headline: "Dev",
        profile_skills: [
          { skill_nodes: { name: "TypeScript" } },
          { skill_nodes: { name: "React" } },
        ],
      },
    ];

    const profilesQuery = mockQuery({ data: pendingProfiles, error: null });

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);
      if (
        table === "profiles" &&
        calls.filter((c) => c === "profiles").length === 1
      ) {
        return profilesQuery;
      }
      return mockUpdateQuery({ data: null, error: null });
    });

    const mockEmbeddings = [new Array(1536).fill(0.1)];
    mockGenerateEmbeddingsBatch.mockResolvedValueOnce(mockEmbeddings);

    const req = makeRequest({ authorization: "Bearer test-embeddings-key" });
    const response = await POST(req, routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed.profiles).toBe(1);

    // Verify join-table skills were used (not the old column fallback)
    const texts = mockGenerateEmbeddingsBatch.mock.calls[0][0] as string[];
    expect(texts[0]).toContain("TypeScript");
    expect(texts[0]).toContain("React");
    expect(texts[0]).not.toContain("OldSkill");
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

    mockFrom.mockImplementation(() => profilesQuery);

    // Must reject on all retry attempts (initial + 2 retries)
    mockGenerateEmbeddingsBatch.mockRejectedValue(
      new Error("OpenAI API error: 500"),
    );

    const req = makeRequest({ authorization: "Bearer test-embeddings-key" });
    const response = await POST(req, routeContext);
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

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);
      if (
        table === "profiles" &&
        calls.filter((c) => c === "profiles").length === 1
      ) {
        return profilesQuery;
      }
      // Update call for skipped profile
      return mockUpdateQuery({ data: null, error: null });
    });

    const req = makeRequest({ authorization: "Bearer test-embeddings-key" });
    const response = await POST(req, routeContext);
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

    const calls: string[] = [];
    mockFrom.mockImplementation((table: string) => {
      calls.push(table);
      if (
        table === "profiles" &&
        calls.filter((c) => c === "profiles").length === 1
      ) {
        return profilesQuery;
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

    const req = makeRequest({ authorization: "Bearer test-embeddings-key" });
    const response = await POST(req, routeContext);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed.profiles).toBe(0);
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0]).toContain("Database error");
  });
});
