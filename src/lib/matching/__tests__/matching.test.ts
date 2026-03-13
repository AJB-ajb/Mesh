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

/**
 * Helper to create a chainable mock Supabase client.
 *
 * The real Supabase PostgREST builder supports arbitrary chaining of
 * .select(), .eq(), .in(), .single(), .insert(), .update(), .upsert().
 * We build a recursive proxy so that any method returns the same chainable
 * object, and the terminal call (.single() / the last .in() / .insert() etc.)
 * can be given a resolved value via `resolveValue`.
 */
function createChainableMock(
  resolveValue: unknown = { data: null, error: null },
) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};

  const makeChain = (): Record<string, unknown> => {
    const obj: Record<string, unknown> = {};
    // Each chainable method returns the same object so any order works
    for (const method of [
      "select",
      "eq",
      "in",
      "single",
      "insert",
      "update",
      "upsert",
      "delete",
    ]) {
      const fn = vi.fn().mockImplementation(() => {
        // If calling a terminal that typically resolves, return promise
        if (method === "single") return Promise.resolve(resolveValue);
        if (method === "insert" || method === "upsert" || method === "delete")
          return Promise.resolve(resolveValue);
        return obj;
      });
      obj[method] = fn;
      chain[method] = fn;
    }
    // .in() is often terminal in these queries — make it resolve
    (obj as Record<string, unknown>).in = vi
      .fn()
      .mockImplementation(() => Promise.resolve(resolveValue));
    chain.in = obj.in as ReturnType<typeof vi.fn>;
    return obj;
  };

  return { chain: makeChain(), fns: chain };
}

/**
 * Creates a mock Supabase client where `.from(tableName)` returns a
 * chainable builder. You can configure per-table responses via the
 * `tables` map, and RPC responses via `rpcResponses`.
 */
function createMockSupabase(
  opts: {
    tables?: Record<string, unknown>;
    rpcResponses?: Array<{ data: unknown; error: unknown }>;
  } = {},
) {
  const tableChains: Record<
    string,
    ReturnType<typeof createChainableMock>
  > = {};
  const fromCalls: Array<{ table: string; chain: Record<string, unknown> }> =
    [];

  // Allow multiple calls to the same table to return different results
  const tableCallCounts: Record<string, number> = {};

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    tableCallCounts[table] = (tableCallCounts[table] || 0) + 1;

    const key = `${table}:${tableCallCounts[table]}`;
    const resolveValue = (opts.tables &&
      (opts.tables[key] || opts.tables[table])) || { data: null, error: null };
    const mock = createChainableMock(resolveValue);
    tableChains[key] = mock;
    fromCalls.push({ table, chain: mock.chain });
    return mock.chain;
  });

  let rpcCallIdx = 0;
  const mockRpc = vi.fn().mockImplementation(() => {
    const responses = opts.rpcResponses || [];
    const resp = responses[rpcCallIdx] || { data: null, error: null };
    rpcCallIdx++;
    return Promise.resolve(resp);
  });

  const mockClient = {
    from: mockFrom,
    rpc: mockRpc,
  };

  return { mockClient, mockFrom, mockRpc, tableChains, fromCalls };
}

describe("matchProfileToPostings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches user profile embedding and calls RPC function", async () => {
    const userEmbedding = new Array(1536).fill(0.1);

    const { mockClient, mockRpc } = createMockSupabase({
      tables: {
        // First call: profiles (profile fetch)
        "profiles:1": {
          data: { embedding: userEmbedding },
          error: null,
        },
        // Second call: activity_cards (existing matches check)
        "activity_cards:1": {
          data: [],
          error: null,
        },
      },
      rpcResponses: [
        {
          data: [
            {
              posting_id: "post-1",
              posting_created_by: "user-2",
              score: 0.85,
              posting_text: "Build an AI app",
              posting_category: "professional",
              posting_tags: ["ai", "web"],
            },
          ],
          error: null,
        },
      ],
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchProfileToPostings("user-1");

    expect(mockRpc).toHaveBeenCalledWith("match_postings_to_user_v2", {
      target_user_id: "user-1",
      match_count: 10,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].score).toBe(0.85);
    // v2 RPC doesn't return title — it's hardcoded to ""
    expect(matches[0].posting.description).toBe("Build an AI app");
  });

  it("throws error when profile not found", async () => {
    const { mockClient } = createMockSupabase({
      tables: {
        profiles: {
          data: null,
          error: { message: "Not found" },
        },
      },
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await expect(matchProfileToPostings("nonexistent")).rejects.toThrow(
      "Profile not found",
    );
  });

  it("returns empty array when profile has no embedding (null)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { mockClient } = createMockSupabase({
      tables: {
        profiles: {
          data: { embedding: null },
          error: null,
        },
      },
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchProfileToPostings("user-1");
    expect(matches).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[matching] Profile embedding not ready"),
    );
    warnSpy.mockRestore();
  });

  it("returns empty array when profile embedding is not an array", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { mockClient } = createMockSupabase({
      tables: {
        profiles: {
          data: { embedding: "not-an-array" },
          error: null,
        },
      },
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchProfileToPostings("user-1");
    expect(matches).toEqual([]);
    warnSpy.mockRestore();
  });

  it("returns empty array when no matches found", async () => {
    const userEmbedding = new Array(1536).fill(0.1);

    const { mockClient } = createMockSupabase({
      tables: {
        profiles: {
          data: { embedding: userEmbedding },
          error: null,
        },
      },
      rpcResponses: [{ data: [], error: null }],
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchProfileToPostings("user-1");
    expect(matches).toEqual([]);
  });

  it("respects limit parameter", async () => {
    const userEmbedding = new Array(1536).fill(0.1);

    const { mockClient, mockRpc } = createMockSupabase({
      tables: {
        profiles: {
          data: { embedding: userEmbedding },
          error: null,
        },
      },
      rpcResponses: [{ data: [], error: null }],
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await matchProfileToPostings("user-1", 5);

    expect(mockRpc).toHaveBeenCalledWith(
      "match_postings_to_user_v2",
      expect.objectContaining({ match_count: 5 }),
    );
  });

  it("maps posting fields from v2 RPC response correctly", async () => {
    const userEmbedding = new Array(1536).fill(0.1);

    const { mockClient } = createMockSupabase({
      tables: {
        "profiles:1": {
          data: { embedding: userEmbedding },
          error: null,
        },
        "activity_cards:1": {
          data: [],
          error: null,
        },
      },
      rpcResponses: [
        {
          data: [
            {
              posting_id: "post-1",
              posting_created_by: "user-2",
              score: 0.85,
              posting_text: "Build an AI app",
              posting_category: "professional",
              posting_tags: ["ai", "web"],
            },
          ],
          error: null,
        },
      ],
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchProfileToPostings("user-1");

    expect(matches).toHaveLength(1);
    // v2 uses "status: open" as hardcoded default
    expect(matches[0].posting.status).toBe("open");
    expect(matches[0].posting.category).toBe("professional");
  });
});

describe("matchPostingToProfiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches posting embedding and calls RPC function", async () => {
    const postingEmbedding = new Array(1536).fill(0.2);

    const { mockClient, mockRpc } = createMockSupabase({
      tables: {
        // First call: space_postings (posting fetch)
        "space_postings:1": {
          data: {
            embedding: postingEmbedding,
            created_by: "creator-1",
            text: "Test posting",
            category: "professional",
            space_id: "space-1",
          },
          error: null,
        },
        // Second call: profiles (fetch profile data for matched users)
        "profiles:1": {
          data: [
            {
              user_id: "user-1",
              full_name: "John Doe",
              headline: "Developer",
              bio: "I build things",
              location_lat: null,
              location_lng: null,
              location_preference: "remote",
              location_mode: null,
              availability_slots: [{ day: "monday", hours: 4 }],
            },
          ],
          error: null,
        },
        // Third call: activity_cards (existing matches check)
        "activity_cards:1": {
          data: [],
          error: null,
        },
      },
      rpcResponses: [
        {
          data: [
            {
              user_id: "user-1",
              score: 0.9,
            },
          ],
          error: null,
        },
      ],
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchPostingToProfiles("post-1");

    expect(mockRpc).toHaveBeenCalledWith("match_users_to_posting_v2", {
      target_posting_id: "post-1",
      match_count: 10,
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].score).toBe(0.9);
    expect(matches[0].profile.full_name).toBe("John Doe");
  });

  it("throws error when posting not found", async () => {
    const { mockClient } = createMockSupabase({
      tables: {
        space_postings: {
          data: null,
          error: { message: "Not found" },
        },
      },
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await expect(matchPostingToProfiles("nonexistent")).rejects.toThrow(
      "Space posting not found: nonexistent",
    );
  });

  it("returns empty array when posting has no embedding (null)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { mockClient } = createMockSupabase({
      tables: {
        space_postings: {
          data: {
            embedding: null,
            created_by: "creator-1",
            text: "Test",
            category: "professional",
            space_id: "space-1",
          },
          error: null,
        },
      },
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchPostingToProfiles("post-1");
    expect(matches).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[matching] Space posting embedding not ready"),
    );
    warnSpy.mockRestore();
  });

  it("returns empty array when posting embedding is not an array", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { mockClient } = createMockSupabase({
      tables: {
        space_postings: {
          data: {
            embedding: "some-string",
            created_by: "creator-1",
            text: "Test",
            category: "professional",
            space_id: "space-1",
          },
          error: null,
        },
      },
    });

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    const matches = await matchPostingToProfiles("post-1");
    expect(matches).toEqual([]);
    warnSpy.mockRestore();
  });
});

describe("createMatchRecords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates activity_card records for new matches via insert", async () => {
    const { mockClient, mockFrom } = createMockSupabase({
      tables: {
        activity_cards: {
          data: null,
          error: null,
        },
      },
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
          team_size_min: 2,
          team_size_max: 5,
          category: "professional",
          tags: [],
          visibility: "public",
          mode: "open",
          location_preference: null,
          estimated_time: null,
          auto_accept: false,
          availability_mode: "flexible",
          timezone: null,
          context_identifier: null,
          parent_posting_id: null,
          natural_language_criteria: null,
          embedding: null,
          status: "open",
          identified_roles: null,
          in_discover: true,
          link_token: null,

          created_at: "",
          updated_at: "",
          expires_at: "",
        },
        score: 0.85,
        scoreBreakdown: null,
      },
    ]);

    // createMatchRecords now uses .insert() not .upsert()
    expect(mockFrom).toHaveBeenCalledWith("activity_cards");
  });

  it("skips matches that already exist", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

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
          team_size_min: 2,
          team_size_max: 5,
          category: "professional",
          tags: [],
          visibility: "public",
          mode: "open",
          location_preference: null,
          estimated_time: null,
          auto_accept: false,
          availability_mode: "flexible",
          timezone: null,
          context_identifier: null,
          parent_posting_id: null,
          natural_language_criteria: null,
          embedding: null,
          status: "open",
          identified_roles: null,
          in_discover: true,
          link_token: null,

          created_at: "",
          updated_at: "",
          expires_at: "",
        },
        score: 0.85,
        scoreBreakdown: null,
        matchId: "existing-match-id", // Already exists
      },
    ]);

    // Should not call from() for insert when all matches already exist
    // (it may still be called for updates if scoreBreakdown is present)
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("does nothing with empty matches array", async () => {
    const { mockClient, mockFrom } = createMockSupabase();

    vi.mocked(createClient).mockResolvedValue(
      mockClient as unknown as Awaited<ReturnType<typeof createClient>>,
    );

    await createMatchRecords("user-1", []);

    expect(mockFrom).not.toHaveBeenCalled();
  });
});

describe("createMatchRecordsForPosting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates activity_card records for posting matches via insert", async () => {
    const { mockClient, mockFrom } = createMockSupabase({
      tables: {
        activity_cards: {
          data: null,
          error: null,
        },
      },
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
          location_preference: null,
          location_mode: null,
          availability_slots: {},
          interests: null,
          languages: null,
          portfolio_url: null,
          github_url: null,
          source_text: null,
          previous_source_text: null,
          previous_profile_snapshot: null,
          embedding: null,
          timezone: null,
          notification_preferences: null,
          tier: "free",

          created_at: "",
          updated_at: "",
        },
        score: 0.9,
        scoreBreakdown: null,
      },
    ]);

    // createMatchRecordsForPosting now uses .insert() not .upsert()
    expect(mockFrom).toHaveBeenCalledWith("activity_cards");
  });
});
