import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

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
    replace: vi.fn(),
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

function mockListQuery(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  };
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

function setupMocks(
  overrides: {
    user?: Record<string, unknown>;
    profileData?: Record<string, unknown> | null;
  } = {},
) {
  const user = overrides.user ?? {
    id: "user-1",
    email: "user@test.com",
    identities: [{ provider: "github" }, { provider: "google" }],
    app_metadata: {
      provider: "github",
      providers: ["github", "google"],
    },
  };

  mockGetUser.mockResolvedValue({ data: { user } });

  const profileData = overrides.profileData ?? {
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

  mockFrom.mockImplementation((table: string) => {
    if (table === "profiles")
      return mockQuery({ data: profileData, error: null });
    return mockListQuery({ data: [], error: null });
  });
}

// ---------------------------------------------------------------------------
// Tests — provider detection, canUndo, data transformation
// ---------------------------------------------------------------------------

describe("useProfileData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects connected providers from user identities", async () => {
    setupMocks({
      user: {
        id: "user-1",
        email: "user@test.com",
        identities: [
          { provider: "github" },
          { provider: "linkedin_oidc" },
          // google NOT connected
        ],
        app_metadata: { provider: "github", providers: ["github"] },
      },
    });

    const { result } = renderHook(() => useProfileData(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.connectedProviders).toEqual({
      github: true,
      google: false,
      linkedin: true,
    });
  });

  it("derives isGithubProvider from app_metadata.provider", async () => {
    setupMocks({
      user: {
        id: "user-1",
        email: "user@test.com",
        identities: [],
        app_metadata: { provider: "github", providers: [] },
      },
    });

    const { result } = renderHook(() => useProfileData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.isGithubProvider).toBe(true);
  });

  it("derives isGithubProvider from identities even without app_metadata match", async () => {
    setupMocks({
      user: {
        id: "user-1",
        email: "user@test.com",
        identities: [{ provider: "github" }],
        app_metadata: { provider: "google", providers: ["google"] },
      },
    });

    const { result } = renderHook(() => useProfileData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.isGithubProvider).toBe(true);
  });

  it("canUndo is true only when previous_source_text exists", async () => {
    setupMocks();
    const { result } = renderHook(() => useProfileData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.canUndo).toBe(true);
  });

  it("canUndo is false when previous_source_text is null", async () => {
    setupMocks({
      profileData: {
        user_id: "user-1",
        full_name: "Test",
        source_text: "some text",
        previous_source_text: null,
        skill_levels: null,
        location_mode: "remote",
      },
    });

    const { result } = renderHook(() => useProfileData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.canUndo).toBe(false);
  });

  it("parseSkillLevels converts {name: level} object to SkillLevel[]", async () => {
    setupMocks();
    const { result } = renderHook(() => useProfileData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.form.skillLevels).toEqual([
      { name: "React", level: 8 },
      { name: "TypeScript", level: 7 },
    ]);
  });

  it("parseLocationMode falls back to 'either' for unknown values", async () => {
    setupMocks({
      profileData: {
        user_id: "user-1",
        full_name: "Test",
        location_mode: "bogus_value",
        skill_levels: null,
      },
    });

    const { result } = renderHook(() => useProfileData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data?.form.locationMode).toBe("either");
  });

  it("joins array fields (skills, interests, languages) with comma-space", async () => {
    setupMocks();
    const { result } = renderHook(() => useProfileData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.form.skills).toBe("React, TypeScript");
    expect(result.current.data?.form.interests).toBe("AI, Web");
    expect(result.current.data?.form.languages).toBe("English");
  });

  it("returns empty strings and defaults when no profile data exists", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-1",
          email: "user@test.com",
          identities: [],
          app_metadata: { provider: "email", providers: ["email"] },
        },
      },
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "profiles")
        return mockQuery({ data: null, error: null });
      return mockListQuery({ data: [], error: null });
    });

    const { result } = renderHook(() => useProfileData(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.canUndo).toBe(false);
    expect(result.current.data?.sourceText).toBeNull();
    expect(result.current.data?.form.fullName).toBe("");
    expect(result.current.data?.form.locationMode).toBe("either");
  });
});
