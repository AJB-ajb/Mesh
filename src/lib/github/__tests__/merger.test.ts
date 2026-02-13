// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  mergeWithExistingProfile,
  shouldUpdateProfile,
  getProfileSuggestions,
  buildGitHubProfileData,
} from "../merger";
import type { Profile } from "@/lib/supabase/types";
import type {
  GitHubProfileData,
  GitHubAnalysisOutput,
  GitHubExtraction,
  GitHubRepo,
} from "../types";

function makeGitHubProfileData(
  overrides: Partial<GitHubProfileData> = {},
): GitHubProfileData {
  return {
    githubId: "12345",
    githubUsername: "testuser",
    githubUrl: "https://github.com/testuser",
    avatarUrl: "https://avatars.githubusercontent.com/u/12345",
    primaryLanguages: ["TypeScript", "Python", "Go"],
    topics: ["web", "api"],
    repoCount: 10,
    totalStars: 50,
    inferredSkills: ["React", "Node.js", "Docker"],
    inferredInterests: ["Web Development", "Cloud Computing"],
    codingStyle: "Clean code advocate",
    collaborationStyle: "async",
    experienceLevel: "intermediate",
    experienceSignals: ["Multiple projects", "Good commit history"],
    suggestedBio: "A passionate developer specializing in web technologies.",
    activityLevel: "high",
    lastActiveAt: new Date().toISOString(),
    rawRepos: [],
    lastSyncedAt: new Date().toISOString(),
    syncStatus: "completed",
    ...overrides,
  };
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    user_id: "user-1",
    full_name: "Test User",
    headline: "Developer",
    bio: "I build things",
    location: "Berlin",
    location_lat: 52.52,
    location_lng: 13.405,
    skills: ["JavaScript", "React"],
    interests: ["AI", "Web Development"],
    languages: ["en", "de"],
    skill_levels: null,
    location_preference: null,
    location_mode: null,
    availability_slots: null,
    portfolio_url: null,
    github_url: null,
    source_text: null,
    previous_source_text: null,
    previous_profile_snapshot: null,
    embedding: null,
    notification_preferences: null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Profile Merger", () => {
  describe("mergeWithExistingProfile", () => {
    it("uses all GitHub data when no existing profile", () => {
      const githubData = makeGitHubProfileData();
      const update = mergeWithExistingProfile(null, githubData);

      expect(update.skills).toBeDefined();
      expect(update.skills!.length).toBeGreaterThan(0);
      expect(update.interests).toBeDefined();
      expect(update.interests!.length).toBeGreaterThan(0);
      expect(update.github_url).toBe("https://github.com/testuser");
      expect(update.bio).toBe(
        "A passionate developer specializing in web technologies.",
      );
    });

    it("merges skills with deduplication (case-insensitive)", () => {
      const existing = makeProfile({
        skills: ["React", "JavaScript"],
      });
      const githubData = makeGitHubProfileData({
        primaryLanguages: ["TypeScript", "javascript"], // 'javascript' should dedupe
        inferredSkills: ["react", "Docker"], // 'react' should dedupe
      });

      const update = mergeWithExistingProfile(existing, githubData);

      // Should keep existing React, JavaScript and add new TypeScript, Docker
      expect(update.skills).toContain("React");
      expect(update.skills).toContain("JavaScript");
      expect(update.skills).toContain("TypeScript");
      expect(update.skills).toContain("Docker");

      // Should not have duplicates (case-insensitive)
      const lowered = update.skills!.map((s) => s.toLowerCase());
      const uniqueLowered = [...new Set(lowered)];
      expect(lowered.length).toBe(uniqueLowered.length);
    });

    it("merges interests with deduplication", () => {
      const existing = makeProfile({
        interests: ["AI", "Web Development"],
      });
      const githubData = makeGitHubProfileData({
        inferredInterests: ["web development", "Cloud Computing"],
      });

      const update = mergeWithExistingProfile(existing, githubData);

      expect(update.interests).toContain("AI");
      expect(update.interests).toContain("Web Development");
      expect(update.interests).toContain("Cloud Computing");

      const lowered = update.interests!.map((s) => s.toLowerCase());
      const uniqueLowered = [...new Set(lowered)];
      expect(lowered.length).toBe(uniqueLowered.length);
    });

    it("always updates github_url", () => {
      const existing = makeProfile({
        github_url: "https://github.com/olduser",
      });
      const githubData = makeGitHubProfileData({
        githubUrl: "https://github.com/newuser",
      });

      const update = mergeWithExistingProfile(existing, githubData);

      expect(update.github_url).toBe("https://github.com/newuser");
    });

    it("does not overwrite existing bio", () => {
      const existing = makeProfile({ bio: "My existing bio" });
      const githubData = makeGitHubProfileData({
        suggestedBio: "A different bio",
      });

      const update = mergeWithExistingProfile(existing, githubData);

      // Bio should not be in the update (existing takes priority)
      expect(update.bio).toBeUndefined();
    });

    it("handles null existing skills and interests", () => {
      const existing = makeProfile({ skills: null, interests: null });
      const githubData = makeGitHubProfileData();

      const update = mergeWithExistingProfile(existing, githubData);

      expect(update.skills!.length).toBeGreaterThan(0);
      expect(update.interests!.length).toBeGreaterThan(0);
    });
  });

  describe("shouldUpdateProfile", () => {
    it("returns true when 3+ new skills are available", () => {
      const existing = makeProfile({ skills: ["JavaScript"] });
      const githubData = makeGitHubProfileData({
        primaryLanguages: ["TypeScript", "Python", "Go"],
        inferredSkills: ["Docker"],
      });

      expect(shouldUpdateProfile(existing, githubData)).toBe(true);
    });

    it("returns true when 2+ new interests are available", () => {
      const existing = makeProfile({ interests: ["AI"] });
      const githubData = makeGitHubProfileData({
        inferredInterests: ["DevOps", "Cloud Computing", "Machine Learning"],
      });

      expect(shouldUpdateProfile(existing, githubData)).toBe(true);
    });

    it("returns false when no significant new data", () => {
      const existing = makeProfile({
        skills: ["TypeScript", "Python", "Go", "React", "Node.js", "Docker"],
        interests: ["Web Development", "Cloud Computing"],
      });
      const githubData = makeGitHubProfileData({
        primaryLanguages: ["TypeScript", "Python"],
        inferredSkills: ["React"],
        inferredInterests: ["Web Development"],
      });

      expect(shouldUpdateProfile(existing, githubData)).toBe(false);
    });

    it("returns false when existing profile already has all skills", () => {
      const existing = makeProfile({
        skills: ["TypeScript", "Python", "Go", "React", "Node.js", "Docker"],
        interests: ["Web Development", "Cloud Computing"],
      });
      const githubData = makeGitHubProfileData({
        primaryLanguages: ["typescript", "python"], // case-insensitive match
        inferredSkills: ["react"],
        inferredInterests: ["web development"],
      });

      expect(shouldUpdateProfile(existing, githubData)).toBe(false);
    });
  });

  describe("getProfileSuggestions", () => {
    it("suggests new skills not in existing profile", () => {
      const existing = makeProfile({ skills: ["React"] });
      const githubData = makeGitHubProfileData({
        primaryLanguages: ["TypeScript"],
        inferredSkills: ["Docker", "React"],
      });

      const suggestions = getProfileSuggestions(existing, githubData);

      expect(suggestions.suggestedSkills).toContain("TypeScript");
      expect(suggestions.suggestedSkills).toContain("Docker");
      expect(suggestions.suggestedSkills).not.toContain("React");
    });

    it("suggests new interests not in existing profile", () => {
      const existing = makeProfile({ interests: ["AI"] });
      const githubData = makeGitHubProfileData({
        inferredInterests: ["AI", "Cloud Computing"],
      });

      const suggestions = getProfileSuggestions(existing, githubData);

      expect(suggestions.suggestedInterests).toContain("Cloud Computing");
      expect(suggestions.suggestedInterests).not.toContain("AI");
    });

    it("suggests bio when existing bio is empty", () => {
      const existing = makeProfile({ bio: null });
      const githubData = makeGitHubProfileData({
        suggestedBio: "A great developer",
      });

      const suggestions = getProfileSuggestions(existing, githubData);

      expect(suggestions.suggestedBio).toBe("A great developer");
    });

    it("suggests bio when existing bio is very short", () => {
      const existing = makeProfile({ bio: "Hi" });
      const githubData = makeGitHubProfileData({
        suggestedBio: "A detailed bio",
      });

      const suggestions = getProfileSuggestions(existing, githubData);

      expect(suggestions.suggestedBio).toBe("A detailed bio");
    });

    it("does not suggest bio when existing bio is adequate", () => {
      const existing = makeProfile({
        bio: "I am an experienced developer with many years of practice in web development.",
      });
      const githubData = makeGitHubProfileData();

      const suggestions = getProfileSuggestions(existing, githubData);

      expect(suggestions.suggestedBio).toBeNull();
    });

    it("handles null existing profile", () => {
      const githubData = makeGitHubProfileData();
      const suggestions = getProfileSuggestions(null, githubData);

      expect(suggestions.suggestedSkills.length).toBeGreaterThan(0);
      expect(suggestions.suggestedInterests.length).toBeGreaterThan(0);
      expect(suggestions.suggestedBio).toBeTruthy();
    });

    it("limits suggestions to 10 skills and 5 interests", () => {
      const existing = makeProfile({ skills: [], interests: [] });
      const githubData = makeGitHubProfileData({
        primaryLanguages: Array.from({ length: 10 }, (_, i) => `Lang${i}`),
        inferredSkills: Array.from({ length: 10 }, (_, i) => `Skill${i}`),
        inferredInterests: Array.from({ length: 10 }, (_, i) => `Interest${i}`),
      });

      const suggestions = getProfileSuggestions(existing, githubData);

      expect(suggestions.suggestedSkills.length).toBeLessThanOrEqual(10);
      expect(suggestions.suggestedInterests.length).toBeLessThanOrEqual(5);
    });
  });

  describe("buildGitHubProfileData", () => {
    it("builds profile data from extraction and analysis", () => {
      const repo: GitHubRepo = {
        id: 1,
        name: "repo",
        full_name: "user/repo",
        description: "desc",
        html_url: "https://github.com/user/repo",
        homepage: null,
        language: "TypeScript",
        stargazers_count: 10,
        watchers_count: 10,
        forks_count: 0,
        open_issues_count: 0,
        size: 100,
        fork: false,
        archived: false,
        disabled: false,
        topics: ["ts"],
        visibility: "public",
        default_branch: "main",
        created_at: "2023-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        pushed_at: "2025-01-01T00:00:00Z",
      };

      const extraction: GitHubExtraction = {
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
          public_repos: 1,
          public_gists: 0,
          followers: 0,
          following: 0,
          created_at: "2020-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
          avatar_url: "https://avatars.githubusercontent.com/u/1",
          html_url: "https://github.com/testuser",
        },
        repos: [repo],
        languages: { TypeScript: 50000 },
        topics: ["ts"],
        commitMessages: [],
        codeSnippets: [],
        readmeContents: [],
      };

      const analysis: GitHubAnalysisOutput = {
        inferredSkills: ["React"],
        inferredInterests: ["Web"],
        codingStyle: "Clean",
        collaborationStyle: "async",
        experienceLevel: "senior",
        experienceSignals: ["signal"],
        suggestedBio: "A dev",
      };

      const result = buildGitHubProfileData(extraction, analysis);

      expect(result.githubId).toBe("1");
      expect(result.githubUsername).toBe("testuser");
      expect(result.primaryLanguages).toEqual(["TypeScript"]);
      expect(result.inferredSkills).toEqual(["React"]);
      expect(result.experienceLevel).toBe("senior");
      expect(result.syncStatus).toBe("completed");
      expect(result.lastSyncedAt).toBeTruthy();
    });
  });
});
