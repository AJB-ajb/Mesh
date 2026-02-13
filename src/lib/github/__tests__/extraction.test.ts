// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GitHubRepo } from "../types";

// Mock api.ts module
vi.mock("../api", () => ({
  fetchGitHubUser: vi.fn(),
  fetchUserRepos: vi.fn(),
  fetchRepoLanguages: vi.fn(),
  fetchRepoCommits: vi.fn(),
  fetchRepoReadme: vi.fn(),
  fetchCommitDetails: vi.fn(),
}));

import {
  extractGitHubProfile,
  getSortedLanguages,
  calculateActivityLevel,
  estimateExperienceFromMetrics,
  prepareAnalysisInput,
} from "../extraction";

import {
  fetchGitHubUser,
  fetchUserRepos,
  fetchRepoLanguages,
  fetchRepoCommits,
  fetchRepoReadme,
  fetchCommitDetails,
} from "../api";

const mockFetchGitHubUser = vi.mocked(fetchGitHubUser);
const mockFetchUserRepos = vi.mocked(fetchUserRepos);
const mockFetchRepoLanguages = vi.mocked(fetchRepoLanguages);
const mockFetchRepoCommits = vi.mocked(fetchRepoCommits);
const mockFetchRepoReadme = vi.mocked(fetchRepoReadme);
const mockFetchCommitDetails = vi.mocked(fetchCommitDetails);

function makeRepo(overrides: Partial<GitHubRepo> = {}): GitHubRepo {
  return {
    id: 1,
    name: "test-repo",
    full_name: "user/test-repo",
    description: "A test repo",
    html_url: "https://github.com/user/test-repo",
    homepage: null,
    language: "TypeScript",
    stargazers_count: 10,
    watchers_count: 10,
    forks_count: 2,
    open_issues_count: 1,
    size: 1000,
    fork: false,
    archived: false,
    disabled: false,
    topics: ["typescript", "testing"],
    visibility: "public",
    default_branch: "main",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    pushed_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("GitHub Extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSortedLanguages", () => {
    it("sorts languages by byte count descending", () => {
      const languages = {
        JavaScript: 10000,
        TypeScript: 50000,
        CSS: 5000,
        Python: 20000,
      };

      const sorted = getSortedLanguages(languages);

      expect(sorted).toEqual(["TypeScript", "Python", "JavaScript", "CSS"]);
    });

    it("returns empty array for no languages", () => {
      expect(getSortedLanguages({})).toEqual([]);
    });

    it("handles single language", () => {
      expect(getSortedLanguages({ Rust: 100 })).toEqual(["Rust"]);
    });
  });

  describe("calculateActivityLevel", () => {
    it("returns 'high' when 5+ repos updated in last 3 months", () => {
      const repos = Array.from({ length: 6 }, (_, i) =>
        makeRepo({
          id: i,
          name: `repo-${i}`,
          pushed_at: new Date().toISOString(),
        }),
      );

      expect(calculateActivityLevel(repos)).toBe("high");
    });

    it("returns 'medium' when 2-4 repos updated recently", () => {
      const repos = [
        makeRepo({ id: 1, pushed_at: new Date().toISOString() }),
        makeRepo({ id: 2, pushed_at: new Date().toISOString() }),
      ];

      expect(calculateActivityLevel(repos)).toBe("medium");
    });

    it("returns 'low' when few recent updates", () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      const repos = [makeRepo({ id: 1, pushed_at: twoYearsAgo.toISOString() })];

      expect(calculateActivityLevel(repos)).toBe("low");
    });

    it("returns 'low' for empty repos array", () => {
      expect(calculateActivityLevel([])).toBe("low");
    });
  });

  describe("estimateExperienceFromMetrics", () => {
    it("returns 'junior' for new accounts with few repos", () => {
      expect(estimateExperienceFromMetrics(2, 0, 0.5)).toBe("junior");
    });

    it("returns 'intermediate' for moderate activity", () => {
      expect(estimateExperienceFromMetrics(20, 50, 3)).toBe("intermediate");
    });

    it("returns 'senior' for experienced accounts", () => {
      expect(estimateExperienceFromMetrics(40, 200, 6)).toBe("senior");
    });

    it("returns 'lead' for very experienced accounts", () => {
      expect(estimateExperienceFromMetrics(50, 1000, 10)).toBe("lead");
    });

    it("caps repo count at 50 in score calculation", () => {
      // 100 repos should score same as 50 repos (capped)
      const score100 = estimateExperienceFromMetrics(100, 0, 0);
      const score50 = estimateExperienceFromMetrics(50, 0, 0);
      expect(score100).toBe(score50);
    });
  });

  describe("extractGitHubProfile", () => {
    it("performs full extraction flow", async () => {
      const user = {
        id: 1,
        login: "testuser",
        name: "Test User",
        email: null,
        bio: null,
        company: null,
        location: null,
        blog: null,
        twitter_username: null,
        public_repos: 5,
        public_gists: 0,
        followers: 10,
        following: 5,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        avatar_url: "https://avatars.githubusercontent.com/u/1",
        html_url: "https://github.com/testuser",
      };

      const repos = [
        makeRepo({ id: 1, name: "cool-project", stargazers_count: 50 }),
      ];

      mockFetchGitHubUser.mockResolvedValue(user);
      mockFetchUserRepos.mockResolvedValue(repos);
      mockFetchRepoLanguages.mockResolvedValue({
        TypeScript: 50000,
        JavaScript: 10000,
      });
      mockFetchRepoCommits.mockResolvedValue([
        {
          sha: "abc123",
          commit: {
            message: "feat: add authentication flow",
            author: {
              name: "Test",
              email: "test@test.com",
              date: "2025-01-01",
            },
          },
          html_url: "https://github.com/testuser/cool-project/commit/abc123",
        },
      ]);
      mockFetchCommitDetails.mockResolvedValue({
        message: "feat: add authentication flow",
        files: [
          {
            filename: "src/auth.ts",
            status: "modified",
            additions: 50,
            deletions: 10,
            patch: "@@ -1,5 +1,10 @@\n+export function login() {}",
          },
        ],
      });
      mockFetchRepoReadme.mockResolvedValue("# Cool Project\nA test project");

      const extraction = await extractGitHubProfile("token");

      expect(extraction.user).toEqual(user);
      expect(extraction.repos).toHaveLength(1);
      expect(extraction.languages).toEqual({
        TypeScript: 50000,
        JavaScript: 10000,
      });
      expect(extraction.topics).toContain("typescript");
      expect(extraction.commitMessages).toContain(
        "feat: add authentication flow",
      );
      expect(extraction.codeSnippets).toHaveLength(1);
      expect(extraction.codeSnippets[0].language).toBe("TypeScript");
      expect(extraction.readmeContents).toHaveLength(1);
    });

    it("handles empty repos gracefully", async () => {
      mockFetchGitHubUser.mockResolvedValue({
        id: 1,
        login: "newuser",
        name: null,
        email: null,
        bio: null,
        company: null,
        location: null,
        blog: null,
        twitter_username: null,
        public_repos: 0,
        public_gists: 0,
        followers: 0,
        following: 0,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        avatar_url: "https://avatars.githubusercontent.com/u/1",
        html_url: "https://github.com/newuser",
      });
      mockFetchUserRepos.mockResolvedValue([]);

      const extraction = await extractGitHubProfile("token");

      expect(extraction.repos).toEqual([]);
      expect(extraction.languages).toEqual({});
      expect(extraction.topics).toEqual([]);
      expect(extraction.commitMessages).toEqual([]);
      expect(extraction.codeSnippets).toEqual([]);
      expect(extraction.readmeContents).toEqual([]);
    });

    it("filters out forks, archived, and disabled repos", async () => {
      mockFetchGitHubUser.mockResolvedValue({
        id: 1,
        login: "user",
        name: null,
        email: null,
        bio: null,
        company: null,
        location: null,
        blog: null,
        twitter_username: null,
        public_repos: 3,
        public_gists: 0,
        followers: 0,
        following: 0,
        created_at: "2020-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        avatar_url: "https://avatars.githubusercontent.com/u/1",
        html_url: "https://github.com/user",
      });
      mockFetchUserRepos.mockResolvedValue([
        makeRepo({ id: 1, name: "original", fork: false }),
        makeRepo({ id: 2, name: "forked", fork: true }),
        makeRepo({ id: 3, name: "archived", archived: true }),
        makeRepo({ id: 4, name: "disabled", disabled: true }),
      ]);
      mockFetchRepoLanguages.mockResolvedValue({});
      mockFetchRepoCommits.mockResolvedValue([]);
      mockFetchRepoReadme.mockResolvedValue(null);

      const extraction = await extractGitHubProfile("token");

      expect(extraction.repos).toHaveLength(1);
      expect(extraction.repos[0].name).toBe("original");
    });
  });

  describe("prepareAnalysisInput", () => {
    it("prepares input from extraction data", () => {
      const extraction = {
        user: {
          id: 1,
          login: "testuser",
          name: "Test",
          email: null,
          bio: null,
          company: null,
          location: null,
          blog: null,
          twitter_username: null,
          public_repos: 5,
          public_gists: 0,
          followers: 10,
          following: 5,
          created_at: "2020-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
          avatar_url: "https://avatars.githubusercontent.com/u/1",
          html_url: "https://github.com/testuser",
        },
        repos: [makeRepo({ stargazers_count: 100, description: "Cool repo" })],
        languages: { TypeScript: 50000, Python: 10000 },
        topics: ["web", "api"],
        commitMessages: ["feat: add auth"],
        codeSnippets: [],
        readmeContents: [{ repoName: "repo", content: "# Readme" }],
      };

      const input = prepareAnalysisInput(extraction);

      expect(input.username).toBe("testuser");
      expect(input.languages).toEqual(["TypeScript", "Python"]);
      expect(input.topics).toEqual(["web", "api"]);
      expect(input.recentCommits).toEqual(["feat: add auth"]);
      expect(input.repoCount).toBe(1);
      expect(input.totalStars).toBe(100);
      expect(input.accountAge).toBeGreaterThan(0);
      expect(input.repoDescriptions).toContain("test-repo: Cool repo");
    });
  });
});
