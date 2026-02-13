// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchGitHubUser,
  fetchUserRepos,
  fetchRepoLanguages,
  fetchRepoCommits,
  fetchRepoReadme,
  checkTokenScopes,
  getRateLimitStatus,
  GitHubAPIError,
} from "../api";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({
      "X-RateLimit-Remaining": "4999",
      "X-RateLimit-Reset": "1700000000",
      ...headers,
    }),
    json: () => Promise.resolve(data),
  };
}

describe("GitHub API Client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchGitHubUser", () => {
    it("returns user data on success", async () => {
      const user = { id: 1, login: "octocat", name: "Octo Cat" };
      mockFetch.mockResolvedValue(jsonResponse(user));

      const result = await fetchGitHubUser("valid-token");

      expect(result).toEqual(user);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/user",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer valid-token",
          }),
        }),
      );
    });

    it("throws GitHubAPIError on 401 (invalid token)", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ message: "Bad credentials" }, 401),
      );

      await expect(fetchGitHubUser("bad-token")).rejects.toThrow(
        GitHubAPIError,
      );
      await expect(fetchGitHubUser("bad-token")).rejects.toThrow(
        "Bad credentials",
      );
    });

    it("throws GitHubAPIError on network error", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(fetchGitHubUser("token")).rejects.toThrow("Network error");
    });
  });

  describe("fetchUserRepos", () => {
    it("returns repos on success", async () => {
      const repos = [
        { id: 1, name: "repo1" },
        { id: 2, name: "repo2" },
      ];
      mockFetch.mockResolvedValue(jsonResponse(repos));

      const result = await fetchUserRepos("token", 10);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("repo1");
    });

    it("handles pagination when more repos than per_page", async () => {
      const page1 = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `repo-${i}`,
      }));
      const page2 = [{ id: 100, name: "repo-100" }];

      mockFetch
        .mockResolvedValueOnce(jsonResponse(page1))
        .mockResolvedValueOnce(jsonResponse(page2));

      const result = await fetchUserRepos("token", 200);

      expect(result).toHaveLength(101);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("returns empty array for no repos", async () => {
      mockFetch.mockResolvedValue(jsonResponse([]));

      const result = await fetchUserRepos("token");

      expect(result).toEqual([]);
    });

    it("respects limit parameter", async () => {
      const repos = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        name: `repo-${i}`,
      }));
      mockFetch.mockResolvedValue(jsonResponse(repos));

      const result = await fetchUserRepos("token", 5);

      expect(result).toHaveLength(5);
    });

    it("throws GitHubAPIError on 403 (rate limit)", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ message: "API rate limit exceeded" }, 403, {
          "X-RateLimit-Remaining": "0",
        }),
      );

      await expect(fetchUserRepos("token")).rejects.toThrow(GitHubAPIError);
    });
  });

  describe("fetchRepoLanguages", () => {
    it("returns language data on success", async () => {
      const languages = { TypeScript: 50000, JavaScript: 20000, CSS: 5000 };
      mockFetch.mockResolvedValue(jsonResponse(languages));

      const result = await fetchRepoLanguages("token", "octocat", "repo");

      expect(result).toEqual(languages);
    });

    it("returns empty object on 404 (repo not found)", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: "Not Found" }, 404));

      const result = await fetchRepoLanguages(
        "token",
        "octocat",
        "nonexistent",
      );

      expect(result).toEqual({});
    });

    it("throws on non-404 errors", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ message: "Server error" }, 500),
      );

      await expect(
        fetchRepoLanguages("token", "octocat", "repo"),
      ).rejects.toThrow(GitHubAPIError);
    });
  });

  describe("fetchRepoCommits", () => {
    it("returns commits on success", async () => {
      const commits = [
        { sha: "abc123", commit: { message: "Initial commit" } },
      ];
      mockFetch.mockResolvedValue(jsonResponse(commits));

      const result = await fetchRepoCommits("token", "octocat", "repo");

      expect(result).toHaveLength(1);
      expect(result[0].sha).toBe("abc123");
    });

    it("returns empty array on 404", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: "Not Found" }, 404));

      const result = await fetchRepoCommits("token", "octocat", "missing");

      expect(result).toEqual([]);
    });

    it("returns empty array on 409 (empty repo)", async () => {
      mockFetch.mockResolvedValue(
        jsonResponse({ message: "Git Repository is empty" }, 409),
      );

      const result = await fetchRepoCommits("token", "octocat", "empty-repo");

      expect(result).toEqual([]);
    });

    it("passes since parameter when provided", async () => {
      mockFetch.mockResolvedValue(jsonResponse([]));

      await fetchRepoCommits(
        "token",
        "octocat",
        "repo",
        "2025-01-01T00:00:00Z",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("since=2025-01-01T00:00:00Z"),
        expect.anything(),
      );
    });

    it("passes limit as per_page", async () => {
      mockFetch.mockResolvedValue(jsonResponse([]));

      await fetchRepoCommits("token", "octocat", "repo", undefined, 10);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("per_page=10"),
        expect.anything(),
      );
    });
  });

  describe("fetchRepoReadme", () => {
    it("decodes base64 README content", async () => {
      const content = {
        content: Buffer.from("# Hello World").toString("base64"),
        encoding: "base64",
      };
      mockFetch.mockResolvedValue(jsonResponse(content));

      const result = await fetchRepoReadme("token", "octocat", "repo");

      expect(result).toBe("# Hello World");
    });

    it("returns null on 404", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ message: "Not Found" }, 404));

      const result = await fetchRepoReadme("token", "octocat", "no-readme");

      expect(result).toBeNull();
    });

    it("returns null when content is missing", async () => {
      mockFetch.mockResolvedValue(jsonResponse({ encoding: "base64" }));

      const result = await fetchRepoReadme("token", "octocat", "repo");

      expect(result).toBeNull();
    });
  });

  describe("checkTokenScopes", () => {
    it("returns scopes from response headers", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({
          "X-OAuth-Scopes": "repo, user, read:org",
        }),
        json: () => Promise.resolve({}),
      });

      const scopes = await checkTokenScopes("token");

      expect(scopes).toEqual(["repo", "user", "read:org"]);
    });

    it("returns empty array when no scopes header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({}),
        json: () => Promise.resolve({}),
      });

      const scopes = await checkTokenScopes("token");

      expect(scopes).toEqual([]);
    });
  });

  describe("getRateLimitStatus", () => {
    it("returns rate limit info", async () => {
      const rateLimitData = {
        rate: {
          limit: 5000,
          remaining: 4999,
          reset: 1700000000,
        },
      };
      mockFetch.mockResolvedValue(jsonResponse(rateLimitData));

      const result = await getRateLimitStatus("token");

      expect(result.limit).toBe(5000);
      expect(result.remaining).toBe(4999);
      expect(result.reset).toBeInstanceOf(Date);
      expect(result.reset.getTime()).toBe(1700000000 * 1000);
    });
  });

  describe("GitHubAPIError", () => {
    it("includes status and rate limit info", () => {
      const error = new GitHubAPIError(
        "Rate limit exceeded",
        403,
        0,
        new Date("2025-01-01"),
      );

      expect(error.message).toBe("Rate limit exceeded");
      expect(error.status).toBe(403);
      expect(error.rateLimitRemaining).toBe(0);
      expect(error.rateLimitReset).toEqual(new Date("2025-01-01"));
      expect(error.name).toBe("GitHubAPIError");
    });
  });
});
