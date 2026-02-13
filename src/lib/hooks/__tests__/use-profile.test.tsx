import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockReplace = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: mockGetUser,
      linkIdentity: vi.fn().mockResolvedValue({ error: null }),
    },
    from: mockFrom,
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

import { useProfile } from "../use-profile";

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
    single: vi.fn().mockResolvedValue(result),
    upsert: vi.fn().mockResolvedValue(result),
  };
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

const fakeUser = {
  id: "user-1",
  email: "user@test.com",
  identities: [{ provider: "github" }, { provider: "google" }],
  app_metadata: {
    provider: "github",
    providers: ["github", "google"],
  },
};

const fakeProfileData = {
  user_id: "user-1",
  full_name: "Test User",
  headline: "Developer",
  bio: "I build things",
  location: "San Francisco",
  location_lat: 37.7749,
  location_lng: -122.4194,
  skills: ["React", "TypeScript"],
  interests: ["AI", "Web"],
  languages: ["English"],
  portfolio_url: "https://example.com",
  github_url: "https://github.com/test",
  source_text: "I am a developer",
  previous_source_text: "I was a developer",
  skill_levels: { React: 8, TypeScript: 7 },
  location_mode: "remote",
  availability_slots: { mon: ["morning", "afternoon"] },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    mockGetUser.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useProfile(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("fetches profile data successfully", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(mockQuery({ data: fakeProfileData, error: null }));

    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.userEmail).toBe("user@test.com");
    expect(result.current.connectedProviders.github).toBe(true);
    expect(result.current.connectedProviders.google).toBe(true);
    expect(result.current.connectedProviders.linkedin).toBe(false);
    expect(result.current.isGithubProvider).toBe(true);
    expect(result.current.sourceText).toBe("I am a developer");
    expect(result.current.canUndo).toBe(true);
  });

  it("maps profile data to form state", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(mockQuery({ data: fakeProfileData, error: null }));

    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Wait for microtask form sync
    await waitFor(() => {
      expect(result.current.form.fullName).toBe("Test User");
    });

    expect(result.current.form.headline).toBe("Developer");
    expect(result.current.form.bio).toBe("I build things");
    expect(result.current.form.skills).toBe("React, TypeScript");
    expect(result.current.form.interests).toBe("AI, Web");
    expect(result.current.form.locationLat).toBe("37.7749");
    expect(result.current.form.locationMode).toBe("remote");
    expect(result.current.form.skillLevels).toEqual([
      { name: "React", level: 8 },
      { name: "TypeScript", level: 7 },
    ]);
  });

  it("redirects to login on auth error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("handles form change when editing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(mockQuery({ data: fakeProfileData, error: null }));

    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Must enter editing mode first — form reads from SWR when not editing
    act(() => {
      result.current.setIsEditing(true);
    });

    act(() => {
      result.current.handleChange("fullName", "New Name");
    });

    expect(result.current.form.fullName).toBe("New Name");
  });

  it("returns default form when no profile data exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(mockQuery({ data: null, error: null }));

    const { result } = renderHook(() => useProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // canUndo is false when no profile exists
    expect(result.current.canUndo).toBe(false);
    expect(result.current.sourceText).toBeNull();
  });
});
