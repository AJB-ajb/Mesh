import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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

import { useProfileData } from "../use-profile-data";

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

describe("useProfileData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts in loading state", () => {
    mockGetUser.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useProfileData(), { wrapper });

    expect(result.current.isLoading).toBe(true);
  });

  it("fetches profile data successfully", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(mockQuery({ data: fakeProfileData, error: null }));

    const { result } = renderHook(() => useProfileData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.userEmail).toBe("user@test.com");
    expect(result.current.data?.connectedProviders.github).toBe(true);
    expect(result.current.data?.connectedProviders.google).toBe(true);
    expect(result.current.data?.connectedProviders.linkedin).toBe(false);
    expect(result.current.data?.isGithubProvider).toBe(true);
    expect(result.current.data?.sourceText).toBe("I am a developer");
    expect(result.current.data?.canUndo).toBe(true);
  });

  it("maps profile data to form state", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(mockQuery({ data: fakeProfileData, error: null }));

    const { result } = renderHook(() => useProfileData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await waitFor(() => {
      expect(result.current.data?.form.fullName).toBe("Test User");
    });

    expect(result.current.data?.form.headline).toBe("Developer");
    expect(result.current.data?.form.bio).toBe("I build things");
    expect(result.current.data?.form.skills).toBe("React, TypeScript");
    expect(result.current.data?.form.interests).toBe("AI, Web");
    expect(result.current.data?.form.locationLat).toBe("37.7749");
    expect(result.current.data?.form.locationMode).toBe("remote");
    expect(result.current.data?.form.skillLevels).toEqual([
      { name: "React", level: 8 },
      { name: "TypeScript", level: 7 },
    ]);
  });

  it("redirects to login on auth error", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    renderHook(() => useProfileData(), { wrapper });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("returns default form when no profile data exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
    mockFrom.mockReturnValue(mockQuery({ data: null, error: null }));

    const { result } = renderHook(() => useProfileData(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data?.canUndo).toBe(false);
    expect(result.current.data?.sourceText).toBeNull();
    expect(result.current.data?.form.fullName).toBe("");
    expect(result.current.data?.form.skills).toBe("");
    expect(result.current.data?.form.locationMode).toBe("either");
  });
});
