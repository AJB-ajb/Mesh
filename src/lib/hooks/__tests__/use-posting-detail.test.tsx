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

import { usePostingDetail } from "../use-posting-detail";

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

function mockQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
    limit: vi.fn().mockReturnThis(),
  };
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

const fakeUser = { id: "user-1", email: "user@test.com" };

const fakePosting = {
  id: "posting-1",
  title: "Hackathon Project",
  description: "Build something cool",
  skills: ["React", "Node"],
  team_size_min: 2,
  team_size_max: 4,
  estimated_time: "2 weeks",
  category: "hackathon",
  mode: "open",
  status: "open",
  created_at: "2026-01-01T00:00:00Z",
  expires_at: "2026-03-01T00:00:00Z",
  creator_id: "owner-1",
  profiles: {
    full_name: "Owner",
    headline: "Dev",
    skills: ["React"],
    user_id: "owner-1",
  },
};

const fakeBreakdown = {
  semantic: 0.8,
  availability: 0.7,
  skill_level: 0.9,
  location: 0.6,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("usePostingDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch when postingId is empty", () => {
    const { result } = renderHook(() => usePostingDetail(""), { wrapper });

    expect(result.current.posting).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("starts in loading state", () => {
    mockGetUser.mockReturnValue(new Promise(() => {})); // never resolve

    const { result } = renderHook(() => usePostingDetail("posting-1"), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.posting).toBeNull();
  });

  it("fetches posting detail for non-owner with match breakdown", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // posting query
        return mockQuery({ data: fakePosting, error: null });
      }
      if (callCount === 2) {
        // application check (maybeSingle)
        return mockQuery({ data: null, error: null });
      }
      if (callCount === 3) {
        // profile fetch
        return mockQuery({
          data: { user_id: "user-1", full_name: "User", skills: ["React"] },
          error: null,
        });
      }
      return mockQuery({ data: null, error: null });
    });

    mockRpc.mockResolvedValue({ data: fakeBreakdown, error: null });

    const { result } = renderHook(() => usePostingDetail("posting-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.posting).toBeTruthy();
    expect(result.current.posting!.title).toBe("Hackathon Project");
    expect(result.current.isOwner).toBe(false);
    expect(result.current.currentUserId).toBe("user-1");
    expect(result.current.matchBreakdown).toEqual(fakeBreakdown);
    expect(result.current.hasApplied).toBe(false);
  });

  it("detects non-owner who has already applied", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    const fakeApplication = {
      id: "app-1",
      status: "applied",
      cover_message: "Hi",
      created_at: "2026-01-01",
      applicant_id: "user-1",
    };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return mockQuery({ data: fakePosting, error: null });
      }
      if (callCount === 2) {
        // application exists
        return mockQuery({ data: fakeApplication, error: null });
      }
      if (callCount === 3) {
        return mockQuery({
          data: { user_id: "user-1", full_name: "User" },
          error: null,
        });
      }
      return mockQuery({ data: null, error: null });
    });

    mockRpc.mockResolvedValue({ data: fakeBreakdown, error: null });

    const { result } = renderHook(() => usePostingDetail("posting-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.hasApplied).toBe(true);
    expect(result.current.myApplication).toEqual(fakeApplication);
  });

  it("returns owner view with applications and matched profiles", async () => {
    const ownerUser = { id: "owner-1", email: "owner@test.com" };
    mockGetUser.mockResolvedValue({ data: { user: ownerUser } });

    const fakeApplications = [
      {
        id: "app-1",
        status: "applied",
        cover_message: null,
        created_at: "2026-01-02",
        applicant_id: "user-1",
        posting_id: "posting-1",
      },
    ];

    const fakeProfiles = [
      {
        user_id: "user-1",
        full_name: "Applicant",
        headline: "Dev",
        skills: ["React"],
        skill_levels: null,
        location_preference: null,
        availability_slots: null,
      },
      {
        user_id: "user-2",
        full_name: "Other",
        headline: "Designer",
        skills: ["Figma"],
        skill_levels: null,
        location_preference: null,
        availability_slots: null,
      },
    ];

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // posting
        return mockQuery({ data: fakePosting, error: null });
      }
      if (callCount === 2) {
        // applications
        return mockQuery({ data: fakeApplications, error: null });
      }
      if (callCount === 3) {
        // all profiles
        return mockQuery({ data: fakeProfiles, error: null });
      }
      if (callCount === 4) {
        // enrichment: applicant profiles
        return mockQuery({
          data: [
            {
              full_name: "Applicant",
              headline: "Dev",
              skills: ["React"],
              user_id: "user-1",
            },
          ],
          error: null,
        });
      }
      return mockQuery({ data: null, error: null });
    });

    mockRpc.mockResolvedValue({ data: fakeBreakdown, error: null });

    const { result } = renderHook(() => usePostingDetail("posting-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isOwner).toBe(true);
    expect(result.current.applications).toHaveLength(1);
    // matched profiles exclude the owner's own profile
    expect(
      result.current.matchedProfiles.every((p) => p.user_id !== "owner-1"),
    ).toBe(true);
  });

  it("returns null posting on fetch error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });

    mockFrom.mockReturnValue(
      mockQuery({ data: null, error: { message: "Not found" } }),
    );

    const { result } = renderHook(() => usePostingDetail("bad-id"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.posting).toBeNull();
    expect(result.current.isOwner).toBe(false);
  });

  it("handles unauthenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    mockFrom.mockReturnValue(mockQuery({ data: fakePosting, error: null }));

    const { result } = renderHook(() => usePostingDetail("posting-1"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.posting).toBeTruthy();
    expect(result.current.isOwner).toBe(false);
    expect(result.current.currentUserId).toBeNull();
  });
});
