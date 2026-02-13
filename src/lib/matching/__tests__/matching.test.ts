import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing modules that use them
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/ai/embeddings", () => ({
  generateProfileEmbedding: vi.fn(() => {
    throw new Error("API key not configured");
  }),
  generatePostingEmbedding: vi.fn(() => {
    throw new Error("API key not configured");
  }),
}));

import { createClient } from "@/lib/supabase/server";
import {
  matchProfileToPostings,
  createMatchRecords,
} from "../profile-to-posting";
import {
  matchPostingToProfiles,
  createMatchRecordsForPosting,
} from "../posting-to-profile";

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

describe("matchProfileToPostings", () => {
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
          posting_id: "post-1",
          similarity: 0.85,
          title: "AI Project",
          description: "Build an AI app",
          skills: ["TypeScript"],
          team_size_min: 2,
          team_size_max: 5,
          category: "professional",
          tags: ["ai", "web"],
          mode: "open",
          location_preference: 0.5,
          estimated_time: "1_month",
          skill_level_min: "intermediate",
          context_identifier: null,
          natural_language_criteria: null,
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

    const matches = await matchProfileToPostings("user-1");

    expect(mockRpc).toHaveBeenCalledWith("match_postings_to_user", {
      user_embedding: userEmbedding,
      user_id_param: "user-1",
      match_limit: 10,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].score).toBe(0.85);
    expect(matches[0].posting.title).toBe("AI Project");
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

    await expect(matchProfileToPostings("nonexistent")).rejects.toThrow(
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

    await expect(matchProfileToPostings("user-1")).rejects.toThrow(
      "Your profile embedding is still being generated",
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

    const matches = await matchProfileToPostings("user-1");
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

    await matchProfileToPostings("user-1", 5);

    expect(mockRpc).toHaveBeenCalledWith(
      "match_postings_to_user",
      expect.objectContaining({ match_limit: 5 }),
    );
  });
});

describe("matchPostingToProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches posting embedding and calls RPC function", async () => {
    const postingEmbedding = new Array(1536).fill(0.2);
    const { mockClient, mockFrom, mockRpc } = createMockSupabase();

    // Mock posting fetch — the code chains .eq("id", ...).single()
    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        embedding: postingEmbedding,
        creator_id: "creator-1",
        title: "Test",
        description: "Test",
        skills: [],
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

    // Mock RPC calls: first for match_users_to_posting, then for compute_match_breakdown
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
            skill_levels: { TypeScript: "senior", React: "intermediate" },
            location_preference: "remote",
            availability_slots: [{ day: "monday", hours: 4 }],
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

    const matches = await matchPostingToProfiles("post-1");

    expect(mockRpc).toHaveBeenCalledWith("match_users_to_posting", {
      posting_embedding: postingEmbedding,
      posting_id_param: "post-1",
      match_limit: 10,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].score).toBe(0.9);
    expect(matches[0].profile.full_name).toBe("John Doe");
  });

  it("throws error when posting not found", async () => {
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

    await expect(matchPostingToProfiles("nonexistent")).rejects.toThrow(
      "Posting not found",
    );
  });

  it("throws error when posting has no embedding", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    const mockSingle = vi.fn().mockResolvedValue({
      data: {
        embedding: null,
        creator_id: "creator-1",
        title: "Test",
        description: "Test",
        skills: [],
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

    await expect(matchPostingToProfiles("post-1")).rejects.toThrow(
      "The posting embedding is still being generated",
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
        posting: {
          id: "post-1",
          creator_id: "creator-1",
          title: "Test",
          description: "Test",
          skills: [],
          team_size_min: 2,
          team_size_max: 5,
          category: "professional",
          tags: [],
          mode: "open",
          location_preference: 0.5,
          estimated_time: null,
          skill_level_min: null,
          context_identifier: null,
          natural_language_criteria: null,
          embedding: null,
          status: "open",

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
          posting_id: "post-1",
          similarity_score: 0.85,
          score_breakdown: null,
          status: "pending",
        },
      ],
      expect.objectContaining({
        onConflict: "posting_id,user_id",
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
        posting: {
          id: "post-1",
          creator_id: "creator-1",
          title: "Test",
          description: "Test",
          skills: [],
          team_size_min: 2,
          team_size_max: 5,
          category: "professional",
          tags: [],
          mode: "open",
          location_preference: 0.5,
          estimated_time: null,
          skill_level_min: null,
          context_identifier: null,
          natural_language_criteria: null,
          embedding: null,
          status: "open",

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

describe("createMatchRecordsForPosting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates match records for posting matches", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    const mockUpsert = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({
      upsert: mockUpsert,
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await createMatchRecordsForPosting("post-1", [
      {
        profile: {
          user_id: "user-1",
          full_name: "John",
          headline: null,
          bio: null,
          location: null,
          location_lat: null,
          location_lng: null,
          skill_levels: {},
          location_preference: null,
          location_mode: null,
          availability_slots: {},
          skills: [],
          interests: null,
          languages: null,
          portfolio_url: null,
          github_url: null,
          source_text: null,
          previous_source_text: null,
          previous_profile_snapshot: null,
          embedding: null,
          notification_preferences: null,

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
          posting_id: "post-1",
          user_id: "user-1",
          similarity_score: 0.9,
          score_breakdown: null,
          status: "pending",
        },
      ],
      expect.objectContaining({
        onConflict: "posting_id,user_id",
      }),
    );
  });
});
