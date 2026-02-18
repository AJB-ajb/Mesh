// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
  })),
}));

import {
  saveGitHubProfile,
  getGitHubProfile,
  updateSyncStatus,
  isSyncNeeded,
  updateUserProfile,
  getUserProfile,
} from "../db";
import type { GitHubProfileData } from "../types";

function makeProfileData(
  overrides: Partial<GitHubProfileData> = {},
): GitHubProfileData {
  return {
    githubId: "12345",
    githubUsername: "testuser",
    githubUrl: "https://github.com/testuser",
    avatarUrl: "https://avatars.githubusercontent.com/u/12345",
    primaryLanguages: ["TypeScript"],
    topics: ["web"],
    repoCount: 10,
    totalStars: 50,
    inferredSkills: ["React"],
    inferredInterests: ["Web Dev"],
    codingStyle: "Clean",
    collaborationStyle: "async",
    experienceLevel: "intermediate",
    experienceSignals: ["signal1"],
    suggestedBio: "A developer",
    activityLevel: "high",
    lastActiveAt: "2025-01-01T00:00:00Z",
    rawRepos: [],
    lastSyncedAt: "2025-01-01T00:00:00Z",
    syncStatus: "completed",
    ...overrides,
  };
}

function mockChain(result: { data?: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    upsert: vi.fn().mockResolvedValue(result),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    update: vi.fn().mockReturnThis(),
  };
  // Make chain thenable so `await supabase.from().update().eq()` resolves
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

describe("GitHub DB Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("saveGitHubProfile", () => {
    it("upserts profile data to github_profiles table", async () => {
      const chain = mockChain({ error: null });
      mockFrom.mockReturnValue(chain);

      await saveGitHubProfile("user-1", makeProfileData());

      expect(mockFrom).toHaveBeenCalledWith("github_profiles");
      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-1",
          github_id: "12345",
          github_username: "testuser",
        }),
        { onConflict: "user_id" },
      );
    });

    it("throws on database error", async () => {
      const chain = mockChain({
        error: { message: "Database connection failed" },
      });
      mockFrom.mockReturnValue(chain);

      await expect(
        saveGitHubProfile("user-1", makeProfileData()),
      ).rejects.toThrow("Failed to save GitHub profile");
    });
  });

  describe("getGitHubProfile", () => {
    it("returns profile data when found", async () => {
      const row = {
        user_id: "user-1",
        github_id: "12345",
        github_username: "testuser",
        github_url: "https://github.com/testuser",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
        primary_languages: ["TypeScript"],
        topics: ["web"],
        repo_count: 10,
        total_stars: 50,
        inferred_skills: ["React"],
        inferred_interests: ["Web Dev"],
        coding_style: "Clean",
        collaboration_style: "async",
        experience_level: "intermediate",
        experience_signals: ["signal1"],
        suggested_bio: "A developer",
        activity_level: "high",
        last_active_at: "2025-01-01T00:00:00Z",
        raw_repos: [],
        last_synced_at: "2025-01-01T00:00:00Z",
        sync_status: "completed",
        sync_error: null,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      };

      const chain = mockChain({ data: row, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await getGitHubProfile("user-1");

      expect(result).not.toBeNull();
      expect(result!.githubUsername).toBe("testuser");
      expect(result!.primaryLanguages).toEqual(["TypeScript"]);
      expect(mockFrom).toHaveBeenCalledWith("github_profiles");
    });

    it("returns null when not found (PGRST116)", async () => {
      const chain = mockChain({
        data: null,
        error: { code: "PGRST116", message: "No rows returned" },
      });
      mockFrom.mockReturnValue(chain);

      const result = await getGitHubProfile("nonexistent");

      expect(result).toBeNull();
    });

    it("throws on other database errors", async () => {
      const chain = mockChain({
        data: null,
        error: { code: "42501", message: "Permission denied" },
      });
      mockFrom.mockReturnValue(chain);

      await expect(getGitHubProfile("user-1")).rejects.toThrow(
        "Failed to get GitHub profile",
      );
    });

    it("returns null when data is null but no error", async () => {
      const chain = mockChain({ data: null, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await getGitHubProfile("user-1");

      expect(result).toBeNull();
    });
  });

  describe("updateSyncStatus", () => {
    it("updates status to syncing", async () => {
      const chain = mockChain({ error: null });
      mockFrom.mockReturnValue(chain);

      await updateSyncStatus("user-1", "syncing");

      expect(mockFrom).toHaveBeenCalledWith("github_profiles");
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "syncing",
          sync_error: null,
        }),
      );
    });

    it("updates status to completed and sets last_synced_at", async () => {
      const chain = mockChain({ error: null });
      mockFrom.mockReturnValue(chain);

      await updateSyncStatus("user-1", "completed");

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "completed",
          last_synced_at: expect.any(String),
        }),
      );
    });

    it("updates status to failed with error message", async () => {
      const chain = mockChain({ error: null });
      mockFrom.mockReturnValue(chain);

      await updateSyncStatus("user-1", "failed", "Token expired");

      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: "failed",
          sync_error: "Token expired",
        }),
      );
    });

    it("does not throw on database error (logs instead)", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      const chain = mockChain({
        error: { message: "DB error" },
      });
      // Make chain.eq().then resolve to return the chain with error
      // The update().eq() chain must return an error
      mockFrom.mockReturnValue(chain);

      // Should not throw
      await updateSyncStatus("user-1", "syncing");

      consoleSpy.mockRestore();
    });
  });

  describe("isSyncNeeded", () => {
    it("returns true when no profile exists (never synced)", async () => {
      // Mock getGitHubProfile to return null
      const chain = mockChain({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });
      mockFrom.mockReturnValue(chain);

      const needed = await isSyncNeeded("new-user");

      expect(needed).toBe(true);
    });

    it("returns false when recently synced", async () => {
      const recentSync = new Date().toISOString();
      const row = {
        user_id: "user-1",
        github_id: "12345",
        github_username: "testuser",
        github_url: "https://github.com/testuser",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
        primary_languages: [],
        topics: [],
        repo_count: 0,
        total_stars: 0,
        inferred_skills: [],
        inferred_interests: [],
        coding_style: "",
        collaboration_style: "hybrid",
        experience_level: "intermediate",
        experience_signals: [],
        suggested_bio: "",
        activity_level: "medium",
        last_active_at: recentSync,
        raw_repos: [],
        last_synced_at: recentSync,
        sync_status: "completed",
        sync_error: null,
        created_at: recentSync,
        updated_at: recentSync,
      };

      const chain = mockChain({ data: row, error: null });
      mockFrom.mockReturnValue(chain);

      const needed = await isSyncNeeded("user-1");

      expect(needed).toBe(false);
    });

    it("returns true when sync is stale (>24h ago)", async () => {
      const staleSync = new Date(
        Date.now() - 25 * 60 * 60 * 1000,
      ).toISOString();
      const row = {
        user_id: "user-1",
        github_id: "12345",
        github_username: "testuser",
        github_url: "https://github.com/testuser",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
        primary_languages: [],
        topics: [],
        repo_count: 0,
        total_stars: 0,
        inferred_skills: [],
        inferred_interests: [],
        coding_style: "",
        collaboration_style: "hybrid",
        experience_level: "intermediate",
        experience_signals: [],
        suggested_bio: "",
        activity_level: "medium",
        last_active_at: staleSync,
        raw_repos: [],
        last_synced_at: staleSync,
        sync_status: "completed",
        sync_error: null,
        created_at: staleSync,
        updated_at: staleSync,
      };

      const chain = mockChain({ data: row, error: null });
      mockFrom.mockReturnValue(chain);

      const needed = await isSyncNeeded("user-1");

      expect(needed).toBe(true);
    });

    it("respects custom maxAgeHours parameter", async () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000,
      ).toISOString();
      const row = {
        user_id: "user-1",
        github_id: "12345",
        github_username: "testuser",
        github_url: "https://github.com/testuser",
        avatar_url: "https://avatars.githubusercontent.com/u/12345",
        primary_languages: [],
        topics: [],
        repo_count: 0,
        total_stars: 0,
        inferred_skills: [],
        inferred_interests: [],
        coding_style: "",
        collaboration_style: "hybrid",
        experience_level: "intermediate",
        experience_signals: [],
        suggested_bio: "",
        activity_level: "medium",
        last_active_at: twoHoursAgo,
        raw_repos: [],
        last_synced_at: twoHoursAgo,
        sync_status: "completed",
        sync_error: null,
        created_at: twoHoursAgo,
        updated_at: twoHoursAgo,
      };

      const chain = mockChain({ data: row, error: null });
      mockFrom.mockReturnValue(chain);

      // With 1 hour max age, 2 hours ago should need sync
      const needed = await isSyncNeeded("user-1", 1);
      expect(needed).toBe(true);
    });
  });

  describe("updateUserProfile", () => {
    it("updates profile in profiles table", async () => {
      const chain = mockChain({ error: null });
      mockFrom.mockReturnValue(chain);

      await updateUserProfile("user-1", {
        interests: ["React", "TypeScript"],
        github_url: "https://github.com/testuser",
      });

      expect(mockFrom).toHaveBeenCalledWith("profiles");
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          interests: ["React", "TypeScript"],
          github_url: "https://github.com/testuser",
          updated_at: expect.any(String),
        }),
      );
    });

    it("throws on database error", async () => {
      const chain = mockChain({ error: { message: "Update failed" } });
      mockFrom.mockReturnValue(chain);

      await expect(
        updateUserProfile("user-1", { interests: ["React"] }),
      ).rejects.toThrow("Failed to update user profile");
    });
  });

  describe("getUserProfile", () => {
    it("returns profile when found", async () => {
      const profileRow = {
        user_id: "user-1",
        full_name: "Test User",
        interests: ["React"],
      };
      const chain = mockChain({ data: profileRow, error: null });
      mockFrom.mockReturnValue(chain);

      const result = await getUserProfile("user-1");

      expect(result).toEqual(profileRow);
      expect(mockFrom).toHaveBeenCalledWith("profiles");
    });

    it("returns null when not found (PGRST116)", async () => {
      const chain = mockChain({
        data: null,
        error: { code: "PGRST116", message: "No rows" },
      });
      mockFrom.mockReturnValue(chain);

      const result = await getUserProfile("nonexistent");

      expect(result).toBeNull();
    });

    it("throws on other database errors", async () => {
      const chain = mockChain({
        data: null,
        error: { code: "42501", message: "Permission denied" },
      });
      mockFrom.mockReturnValue(chain);

      await expect(getUserProfile("user-1")).rejects.toThrow(
        "Failed to get user profile",
      );
    });
  });
});
