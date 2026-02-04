import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing modules that use them
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/environment", () => ({
  getTestDataValue: vi.fn(() => false),
}));

vi.mock("@/lib/ai/embeddings", () => ({
  generateProfileEmbedding: vi.fn(() => {
    throw new Error("API key not configured");
  }),
  generateProjectEmbedding: vi.fn(() => {
    throw new Error("API key not configured");
  }),
}));

import { createClient } from "@/lib/supabase/server";
import {
  matchProfileToProjects,
  createMatchRecords,
} from "../profile-to-project";
import {
  matchProjectToProfiles,
  createMatchRecordsForProject,
} from "../project-to-profile";

// Helper to create mock Supabase client
function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const mockFrom = vi.fn();
  const mockRpc = vi.fn();

  const mockClient = {
    from: mockFrom,
    rpc: mockRpc,
    ...overrides,
  };

  return { mockClient, mockFrom, mockRpc };
}

describe("matchProfileToProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches user profile embedding and calls RPC function", async () => {
    const userEmbedding = new Array(1536).fill(0.1);
    const { mockClient, mockFrom, mockRpc } = createMockSupabase();

    // Mock profile fetch
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { embedding: userEmbedding },
            error: null,
          }),
        }),
      }),
    });

    // Mock RPC call
    mockRpc.mockResolvedValue({
      data: [
        {
          project_id: "proj-1",
          similarity: 0.85,
          title: "AI Project",
          description: "Build an AI app",
          required_skills: ["TypeScript"],
          team_size: 3,
          experience_level: "intermediate",
          commitment_hours: 10,
          timeline: "1_month",
          creator_id: "user-2",
          created_at: "2024-01-01",
          expires_at: "2024-02-01",
        },
      ],
      error: null,
    });

    // Mock existing matches check
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { embedding: userEmbedding },
            error: null,
          }),
        }),
      }),
    });

    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchProfileToProjects("user-1");

    expect(mockRpc).toHaveBeenCalledWith("match_projects_to_user", {
      user_embedding: userEmbedding,
      user_id_param: "user-1",
      match_limit: 10,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].score).toBe(0.85);
    expect(matches[0].project.title).toBe("AI Project");
  });

  it("throws error when profile not found", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Not found" },
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await expect(matchProfileToProjects("nonexistent")).rejects.toThrow(
      "Profile not found",
    );
  });

  it("throws error when profile has no embedding", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { embedding: null },
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await expect(matchProfileToProjects("user-1")).rejects.toThrow(
      "Could not generate profile embedding",
    );
  });

  it("returns empty array when no matches found", async () => {
    const userEmbedding = new Array(1536).fill(0.1);
    const { mockClient, mockFrom, mockRpc } = createMockSupabase();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { embedding: userEmbedding },
            error: null,
          }),
        }),
      }),
    });

    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchProfileToProjects("user-1");
    expect(matches).toEqual([]);
  });

  it("respects limit parameter", async () => {
    const userEmbedding = new Array(1536).fill(0.1);
    const { mockClient, mockFrom, mockRpc } = createMockSupabase();

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { embedding: userEmbedding },
            error: null,
          }),
        }),
      }),
    });

    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await matchProfileToProjects("user-1", 5);

    expect(mockRpc).toHaveBeenCalledWith(
      "match_projects_to_user",
      expect.objectContaining({ match_limit: 5 }),
    );
  });
});

describe("matchProjectToProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches project embedding and calls RPC function", async () => {
    const projectEmbedding = new Array(1536).fill(0.2);
    const { mockClient, mockFrom, mockRpc } = createMockSupabase();

    // Mock project fetch — the code chains .eq("id", ...).eq("is_test_data", ...).single()
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        embedding: projectEmbedding,
        creator_id: "creator-1",
        title: "Test",
        description: "Test",
        required_skills: [],
      },
      error: null,
    });
    const mockEqInner = vi.fn().mockReturnValue({ single: mockSingle });
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockEqInner,
          single: mockSingle,
        }),
      }),
    });

    // Mock RPC calls: first for match_users_to_project, then for compute_match_breakdown
    mockRpc
      .mockResolvedValueOnce({
        data: [
          {
            user_id: "user-1",
            similarity: 0.9,
            full_name: "John Doe",
            headline: "Developer",
            bio: "I build things",
            skills: ["TypeScript", "React"],
            experience_level: "senior",
            availability_hours: 20,
            collaboration_style: "async",
          },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: null,
      });

    // Mock existing matches check
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchProjectToProfiles("proj-1");

    expect(mockRpc).toHaveBeenCalledWith("match_users_to_project", {
      project_embedding: projectEmbedding,
      project_id_param: "proj-1",
      match_limit: 10,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].score).toBe(0.9);
    expect(matches[0].profile.full_name).toBe("John Doe");
  });

  it("throws error when project not found", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    const mockSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Not found" },
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: mockSingle }),
          single: mockSingle,
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await expect(matchProjectToProfiles("nonexistent")).rejects.toThrow(
      "Project not found",
    );
  });

  it("throws error when project has no embedding", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        embedding: null,
        creator_id: "creator-1",
        title: "Test",
        description: "Test",
        required_skills: [],
      },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ single: mockSingle }),
          single: mockSingle,
        }),
      }),
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await expect(matchProjectToProfiles("proj-1")).rejects.toThrow(
      "Could not generate project embedding",
    );
  });
});

describe("createMatchRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates match records for new matches", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await createMatchRecords("user-1", [
      {
        project: {
          id: "proj-1",
          creator_id: "creator-1",
          title: "Test",
          description: "Test",
          required_skills: [],
          team_size: 3,
          experience_level: null,
          commitment_hours: null,
          timeline: null,
          hard_filters: null,
          embedding: null,
          status: "open",
          is_test_data: false,
          created_at: "",
          updated_at: "",
          expires_at: "",
        },
        score: 0.85,
        scoreBreakdown: null,
      },
    ]);

    expect(mockUpsert).toHaveBeenCalledWith(
      [
        {
          user_id: "user-1",
          project_id: "proj-1",
          similarity_score: 0.85,
          score_breakdown: null,
          status: "pending",
        },
      ],
      expect.objectContaining({
        onConflict: "project_id,user_id",
      }),
    );
  });

  it("skips matches that already exist", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await createMatchRecords("user-1", [
      {
        project: {
          id: "proj-1",
          creator_id: "creator-1",
          title: "Test",
          description: "Test",
          required_skills: [],
          team_size: 3,
          experience_level: null,
          commitment_hours: null,
          timeline: null,
          hard_filters: null,
          embedding: null,
          status: "open",
          is_test_data: false,
          created_at: "",
          updated_at: "",
          expires_at: "",
        },
        score: 0.85,
        scoreBreakdown: null,
        matchId: "existing-match-id", // Already exists
      },
    ]);

    // Should not call upsert when all matches already exist
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("does nothing with empty matches array", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    const mockUpsert = vi.fn();
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await createMatchRecords("user-1", []);

    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("createMatchRecordsForProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates match records for project matches", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await createMatchRecordsForProject("proj-1", [
      {
        profile: {
          user_id: "user-1",
          full_name: "John",
          headline: null,
          bio: null,
          location: null,
          location_lat: null,
          location_lng: null,
          experience_level: null,
          collaboration_style: null,
          remote_preference: null,
          availability_hours: null,
          skills: [],
          interests: null,
          languages: null,
          portfolio_url: null,
          github_url: null,
          project_preferences: {},
          hard_filters: null,
          embedding: null,
          is_test_data: false,
          created_at: "",
          updated_at: "",
        },
        score: 0.9,
        scoreBreakdown: null,
      },
    ]);

    expect(mockUpsert).toHaveBeenCalledWith(
      [
        {
          project_id: "proj-1",
          user_id: "user-1",
          similarity_score: 0.9,
          score_breakdown: null,
          status: "pending",
        },
      ],
      expect.objectContaining({
        onConflict: "project_id,user_id",
      }),
    );
  });
});
