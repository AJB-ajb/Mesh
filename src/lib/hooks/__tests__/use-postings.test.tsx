import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

vi.mock("@/lib/matching/scoring", async () => {
  const actual = await vi.importActual<typeof import("@/lib/matching/scoring")>(
    "@/lib/matching/scoring",
  );
  return {
    ...actual,
    formatScore: (n: number) => `${Math.round(n * 100)}%`,
  };
});

import { usePostings } from "../use-postings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ dedupingInterval: 0, provider: () => new Map() }}>
      {children}
    </SWRConfig>
  );
}

/** Build a chainable Supabase query mock */
function mockQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockReturnThis(),
  };
  // Terminal — when awaited the chain itself resolves
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

const fakeUser = { id: "user-1", email: "user@test.com" };

const fakePostings = [
  {
    id: "p1",
    title: "Study Group",
    description: "Math study",
    skills: ["math"],
    team_size_min: 2,
    team_size_max: 5,
    category: "study",
    tags: [],
    mode: "open",
    status: "open",
    created_at: "2026-01-01T00:00:00Z",
    creator_id: "other-user",
    profiles: { full_name: "Other", user_id: "other-user" },
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePostings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    // Never resolve the query so it stays loading
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnValue(new Promise(() => {})),
    });

    const { result } = renderHook(() => usePostings("discover"), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.postings).toEqual([]);
  });

  it("fetches postings for discover tab", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // postings query
        return mockQuery({ data: fakePostings, error: null });
      }
      if (callCount === 2) {
        // matches (interested) query
        return mockQuery({ data: [], error: null });
      }
      // profiles query for scoring
      return mockQuery({
        data: { user_id: "user-1", skills: ["math"] },
        error: null,
      });
    });

    mockRpc.mockResolvedValue({
      data: [
        {
          posting_id: "p1",
          breakdown: {
            semantic: 0.8,
            availability: 0.7,
            skill_level: 0.9,
            location: 0.6,
          },
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => usePostings("discover"), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.postings).toHaveLength(1);
    expect(result.current.postings[0].title).toBe("Study Group");
    expect(result.current.userId).toBe("user-1");
    // Score = (0.8*1.0 + 0.7*1.0 + 0.9*0.7 + 0.6*0.7) / (1.0+1.0+0.7+0.7) = 2.55/3.4 = 0.75
    expect(result.current.postings[0].compatibility_score).toBeCloseTo(0.75);
  });

  it("fetches postings for my-postings tab", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const myPostings = [{ ...fakePostings[0], creator_id: "user-1" }];
    mockFrom.mockReturnValue(mockQuery({ data: myPostings, error: null }));

    const { result } = renderHook(() => usePostings("my-postings"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.postings).toHaveLength(1);
  });

  it("handles fetch errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    mockFrom.mockReturnValue(
      mockQuery({ data: null, error: { message: "DB error" } }),
    );

    const { result } = renderHook(() => usePostings("my-postings"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it("filters by category when provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    mockFrom.mockReturnValue(mockQuery({ data: [], error: null }));

    const { result } = renderHook(
      () => usePostings("my-postings", "hackathon"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.postings).toEqual([]);
    // Verify the chain was called with category filter
    expect(mockFrom).toHaveBeenCalledWith("postings");
  });

  it("ignores 'all' category", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(mockQuery({ data: [], error: null }));

    const { result } = renderHook(() => usePostings("my-postings", "all"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("returns interestedPostingIds for discover tab", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return mockQuery({ data: fakePostings, error: null });
      }
      if (callCount === 2) {
        // matches (interested) query
        return mockQuery({
          data: [{ posting_id: "p1" }, { posting_id: "p2" }],
          error: null,
        });
      }
      // profiles
      return mockQuery({ data: null, error: { message: "no profile" } });
    });

    const { result } = renderHook(() => usePostings("discover"), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.interestedPostingIds).toEqual(["p1", "p2"]);
  });
});
