/**
 * GitHub API Client
 * Handles authentication and API calls to GitHub
 */

import type {
  GitHubRepo,
  GitHubCommit,
  GitHubUser,
  GitHubContent,
} from "./types";

const GITHUB_API_BASE = "https://api.github.com";

/**
 * GitHub API error
 */
export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public rateLimitRemaining?: number,
    public rateLimitReset?: Date,
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

/**
 * Make authenticated request to GitHub API
 */
async function githubFetch<T>(
  endpoint: string,
  accessToken: string,
  options: RequestInit = {},
): Promise<T> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GITHUB_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Mesh-App",
      ...options.headers,
    },
  });

  const rateLimitRemaining = parseInt(
    response.headers.get("X-RateLimit-Remaining") || "0",
  );
  const rateLimitReset = response.headers.get("X-RateLimit-Reset");

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new GitHubAPIError(
      error.message || `GitHub API error: ${response.status}`,
      response.status,
      rateLimitRemaining,
      rateLimitReset ? new Date(parseInt(rateLimitReset) * 1000) : undefined,
    );
  }

  return response.json();
}

/**
 * Fetch authenticated user's profile
 */
export async function fetchGitHubUser(
  accessToken: string,
): Promise<GitHubUser> {
  return githubFetch<GitHubUser>("/user", accessToken);
}

/**
 * Fetch user's repositories (sorted by last updated)
 * @param limit Maximum number of repos to fetch (default 100)
 */
export async function fetchUserRepos(
  accessToken: string,
  limit: number = 100,
): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];
  let page = 1;
  const perPage = Math.min(limit, 100);

  while (repos.length < limit) {
    const pageRepos = await githubFetch<GitHubRepo[]>(
      `/user/repos?sort=updated&direction=desc&per_page=${perPage}&page=${page}`,
      accessToken,
    );

    if (pageRepos.length === 0) break;

    repos.push(...pageRepos);
    page++;

    // Stop if we got fewer than requested (last page)
    if (pageRepos.length < perPage) break;
  }

  return repos.slice(0, limit);
}

/**
 * Fetch languages for a specific repository
 */
export async function fetchRepoLanguages(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<Record<string, number>> {
  try {
    return await githubFetch<Record<string, number>>(
      `/repos/${owner}/${repo}/languages`,
      accessToken,
    );
  } catch (error) {
    // Return empty if repo is private or inaccessible
    if (error instanceof GitHubAPIError && error.status === 404) {
      return {};
    }
    throw error;
  }
}

/**
 * Fetch recent commits for a repository
 * @param since ISO date string for commits after this date
 * @param limit Maximum number of commits to fetch
 */
export async function fetchRepoCommits(
  accessToken: string,
  owner: string,
  repo: string,
  since?: string,
  limit: number = 30,
): Promise<GitHubCommit[]> {
  try {
    const sinceParam = since ? `&since=${since}` : "";
    return await githubFetch<GitHubCommit[]>(
      `/repos/${owner}/${repo}/commits?per_page=${limit}${sinceParam}`,
      accessToken,
    );
  } catch (error) {
    // Return empty if repo is private or has no commits
    if (error instanceof GitHubAPIError && [404, 409].includes(error.status)) {
      return [];
    }
    throw error;
  }
}

/**
 * Fetch README content for a repository
 */
export async function fetchRepoReadme(
  accessToken: string,
  owner: string,
  repo: string,
): Promise<string | null> {
  try {
    const content = await githubFetch<GitHubContent>(
      `/repos/${owner}/${repo}/readme`,
      accessToken,
    );

    if (content.content && content.encoding === "base64") {
      return Buffer.from(content.content, "base64").toString("utf-8");
    }

    return null;
  } catch (error) {
    // Return null if no README exists
    if (error instanceof GitHubAPIError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch a specific file's content from a repository
 */
export async function fetchFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
): Promise<string | null> {
  try {
    const content = await githubFetch<GitHubContent>(
      `/repos/${owner}/${repo}/contents/${path}`,
      accessToken,
    );

    if (content.content && content.encoding === "base64") {
      return Buffer.from(content.content, "base64").toString("utf-8");
    }

    return null;
  } catch (error) {
    if (error instanceof GitHubAPIError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch file content from a specific commit
 */
export async function fetchCommitFile(
  accessToken: string,
  owner: string,
  repo: string,
  commitSha: string,
  filePath: string,
): Promise<string | null> {
  try {
    const content = await githubFetch<GitHubContent>(
      `/repos/${owner}/${repo}/contents/${filePath}?ref=${commitSha}`,
      accessToken,
    );

    if (content.content && content.encoding === "base64") {
      return Buffer.from(content.content, "base64").toString("utf-8");
    }

    return null;
  } catch (error) {
    if (error instanceof GitHubAPIError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Fetch the diff/changes for a specific commit
 */
export async function fetchCommitDetails(
  accessToken: string,
  owner: string,
  repo: string,
  commitSha: string,
): Promise<{
  message: string;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string;
  }>;
}> {
  try {
    const commit = await githubFetch<{
      commit: { message: string };
      files: Array<{
        filename: string;
        status: string;
        additions: number;
        deletions: number;
        patch?: string;
      }>;
    }>(`/repos/${owner}/${repo}/commits/${commitSha}`, accessToken);

    return {
      message: commit.commit.message,
      files: commit.files || [],
    };
  } catch (error) {
    if (error instanceof GitHubAPIError && error.status === 404) {
      return { message: "", files: [] };
    }
    throw error;
  }
}

/**
 * Check if access token has required scopes
 */
export async function checkTokenScopes(accessToken: string): Promise<string[]> {
  const response = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const scopes = response.headers.get("X-OAuth-Scopes");
  return scopes ? scopes.split(", ").map((s) => s.trim()) : [];
}

/**
 * Get rate limit status
 */
export async function getRateLimitStatus(accessToken: string): Promise<{
  limit: number;
  remaining: number;
  reset: Date;
}> {
  const data = await githubFetch<{
    rate: {
      limit: number;
      remaining: number;
      reset: number;
    };
  }>("/rate_limit", accessToken);

  return {
    limit: data.rate.limit,
    remaining: data.rate.remaining,
    reset: new Date(data.rate.reset * 1000),
  };
}
