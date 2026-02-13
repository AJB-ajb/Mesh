// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------- Supabase mock ----------
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser, getSession: mockGetSession },
    from: mockFrom,
  })),
}));

// ---------- GitHub module mock ----------
const mockExtractGitHubProfile = vi.fn();
const mockPrepareAnalysisInput = vi.fn();
const mockAnalyzeGitHubProfile = vi.fn();
const mockBuildGitHubProfileData = vi.fn();
const mockMergeWithExistingProfile = vi.fn();
const mockGetProfileSuggestions = vi.fn();
const mockSaveGitHubProfile = vi.fn();
const mockGetGitHubProfile = vi.fn();
const mockUpdateSyncStatus = vi.fn();
const mockUpdateUserProfile = vi.fn();
const mockGetUserProfile = vi.fn();

vi.mock("@/lib/github", () => ({
  extractGitHubProfile: (...args: unknown[]) =>
    mockExtractGitHubProfile(...args),
  prepareAnalysisInput: (...args: unknown[]) =>
    mockPrepareAnalysisInput(...args),
  analyzeGitHubProfile: (...args: unknown[]) =>
    mockAnalyzeGitHubProfile(...args),
  buildGitHubProfileData: (...args: unknown[]) =>
    mockBuildGitHubProfileData(...args),
  mergeWithExistingProfile: (...args: unknown[]) =>
    mockMergeWithExistingProfile(...args),
  getProfileSuggestions: (...args: unknown[]) =>
    mockGetProfileSuggestions(...args),
  saveGitHubProfile: (...args: unknown[]) => mockSaveGitHubProfile(...args),
  getGitHubProfile: (...args: unknown[]) => mockGetGitHubProfile(...args),
  updateSyncStatus: (...args: unknown[]) => mockUpdateSyncStatus(...args),
  updateUserProfile: (...args: unknown[]) => mockUpdateUserProfile(...args),
  getUserProfile: (...args: unknown[]) => mockGetUserProfile(...args),
}));

import { GET, POST } from "../route";

const MOCK_USER = {
  id: "user-1",
  email: "a@b.com",
  identities: [{ provider: "github" }],
};

function authedUserWithGithub() {
  mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
  mockGetSession.mockResolvedValue({
    data: { session: { provider_token: "gh-token-123" } },
  });
}

describe("POST /api/github/sync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it("returns 400 when provider token is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: MOCK_USER }, error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { provider_token: null } },
    });
    const res = await POST();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("GitHub access token");
  });

  it("returns 400 when no GitHub identity linked", async () => {
    const userNoGithub = { id: "user-1", email: "a@b.com", identities: [] };
    mockGetUser.mockResolvedValue({
      data: { user: userNoGithub },
      error: null,
    });
    mockGetSession.mockResolvedValue({
      data: { session: { provider_token: "token" } },
    });
    const res = await POST();
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("not linked");
  });

  it("syncs GitHub profile successfully", async () => {
    authedUserWithGithub();

    const extraction = {
      repos: [{ name: "repo1" }],
      commitMessages: ["fix: bug"],
    };
    const analysisInput = { codeSnippets: ["snippet1"] };
    const analysis = {
      inferredSkills: ["TypeScript"],
      inferredInterests: ["Web"],
    };
    const githubProfileData = {
      githubUsername: "testuser",
      repoCount: 1,
      primaryLanguages: ["TypeScript"],
      inferredSkills: ["TypeScript"],
      inferredInterests: ["Web"],
      codingStyle: "clean",
      activityLevel: "active",
    };
    const existingProfile = { bio: "Old bio" };
    const suggestions = {
      suggestedBio: "New bio",
      suggestedSkills: ["TypeScript"],
      suggestedInterests: ["Web"],
    };

    mockUpdateSyncStatus.mockResolvedValue(undefined);
    mockExtractGitHubProfile.mockResolvedValue(extraction);
    mockPrepareAnalysisInput.mockReturnValue(analysisInput);
    mockAnalyzeGitHubProfile.mockResolvedValue(analysis);
    mockBuildGitHubProfileData.mockReturnValue(githubProfileData);
    mockSaveGitHubProfile.mockResolvedValue(undefined);
    mockGetUserProfile.mockResolvedValue(existingProfile);
    mockGetProfileSuggestions.mockReturnValue(suggestions);
    mockMergeWithExistingProfile.mockReturnValue({ bio: "New bio" });
    mockUpdateUserProfile.mockResolvedValue(undefined);

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.githubUsername).toBe("testuser");
    expect(body.suggestions.suggestedBio).toBe("New bio");
    expect(mockExtractGitHubProfile).toHaveBeenCalledWith("gh-token-123");
  });

  it("returns 500 when extraction fails", async () => {
    authedUserWithGithub();
    mockUpdateSyncStatus.mockResolvedValue(undefined);
    mockExtractGitHubProfile.mockRejectedValue(
      new Error("GitHub API rate limit"),
    );

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toContain("rate limit");
  });

  it("returns 500 when analysis fails", async () => {
    authedUserWithGithub();
    mockUpdateSyncStatus.mockResolvedValue(undefined);
    mockExtractGitHubProfile.mockResolvedValue({
      repos: [],
      commitMessages: [],
    });
    mockPrepareAnalysisInput.mockReturnValue({ codeSnippets: [] });
    mockAnalyzeGitHubProfile.mockRejectedValue(new Error("OpenAI down"));

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.message).toContain("OpenAI down");
  });
});

describe("GET /api/github/sync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No" },
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns synced:false when no GitHub profile", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });
    mockGetGitHubProfile.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.synced).toBe(false);
  });

  it("returns GitHub profile data when synced", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: MOCK_USER },
      error: null,
    });

    const githubProfile = {
      githubUsername: "testuser",
      githubUrl: "https://github.com/testuser",
      avatarUrl: "https://avatars.githubusercontent.com/u/123",
      repoCount: 10,
      totalStars: 50,
      primaryLanguages: ["TypeScript"],
      topics: ["web"],
      inferredSkills: ["React"],
      inferredInterests: ["AI"],
      experienceSignals: {},
      codingStyle: "clean",
      collaborationStyle: "async",
      activityLevel: "active",
      suggestedBio: "A developer",
      lastSyncedAt: "2026-01-01",
      syncStatus: "completed",
    };
    mockGetGitHubProfile.mockResolvedValue(githubProfile);
    mockGetUserProfile.mockResolvedValue({ bio: "Existing bio" });
    mockGetProfileSuggestions.mockReturnValue({
      suggestedBio: "Better bio",
      suggestedSkills: ["React"],
      suggestedInterests: ["AI"],
    });

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.synced).toBe(true);
    expect(body.data.githubUsername).toBe("testuser");
    expect(body.suggestions).toBeDefined();
  });
});
