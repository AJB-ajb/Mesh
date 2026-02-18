/**
 * Profile Merger
 * Merges GitHub extracted data with existing profile data
 * User-edited fields take precedence over GitHub inferred data
 */

import type { Profile, ProfileUpdate } from "../supabase/types";
import type { GitHubProfileData, GitHubAnalysisOutput } from "./types";
import type { GitHubExtraction } from "./types";
import { getSortedLanguages, calculateActivityLevel } from "./extraction";

/**
 * Deduplicate and merge arrays (case-insensitive)
 */
function mergeArrays(
  existing: string[] | null | undefined,
  incoming: string[] | null | undefined,
): string[] {
  const existingSet = new Set(
    (existing || []).map((s) => s.toLowerCase().trim()),
  );
  const merged = [...(existing || [])];

  for (const item of incoming || []) {
    const normalized = item.toLowerCase().trim();
    if (!existingSet.has(normalized) && item.trim()) {
      merged.push(item.trim());
      existingSet.add(normalized);
    }
  }

  return merged;
}

/**
 * Build GitHubProfileData from extraction and analysis
 */
export function buildGitHubProfileData(
  extraction: GitHubExtraction,
  analysis: GitHubAnalysisOutput,
): GitHubProfileData {
  const languages = getSortedLanguages(extraction.languages);
  const totalStars = extraction.repos.reduce(
    (sum, repo) => sum + repo.stargazers_count,
    0,
  );
  const activityLevel = calculateActivityLevel(extraction.repos);

  // Find most recent activity
  const lastActiveAt = extraction.repos.reduce((latest, repo) => {
    const pushedAt = new Date(repo.pushed_at);
    return pushedAt > latest ? pushedAt : latest;
  }, new Date(0));

  return {
    // GitHub user info
    githubId: extraction.user.id.toString(),
    githubUsername: extraction.user.login,
    githubUrl: extraction.user.html_url,
    avatarUrl: extraction.user.avatar_url,

    // Extracted data
    primaryLanguages: languages.slice(0, 10),
    topics: extraction.topics.slice(0, 20),
    repoCount: extraction.repos.length,
    totalStars,

    // Inferred data from LLM
    inferredSkills: analysis.inferredSkills,
    inferredInterests: analysis.inferredInterests,
    codingStyle: analysis.codingStyle,
    collaborationStyle: analysis.collaborationStyle,
    experienceLevel: analysis.experienceLevel,
    experienceSignals: analysis.experienceSignals,
    suggestedBio: analysis.suggestedBio,

    // Activity metrics
    activityLevel,
    lastActiveAt: lastActiveAt.toISOString(),

    // Raw data
    rawRepos: extraction.repos,

    // Sync metadata
    lastSyncedAt: new Date().toISOString(),
    syncStatus: "completed",
  };
}

/**
 * Merge GitHub profile data with existing user profile
 * User-edited fields take precedence
 */
export function mergeWithExistingProfile(
  existingProfile: Profile | null,
  githubData: GitHubProfileData,
): ProfileUpdate {
  // If no existing profile, build from GitHub data
  if (!existingProfile) {
    return {
      interests: githubData.inferredInterests.slice(0, 10),
      github_url: githubData.githubUrl,
      bio: githubData.suggestedBio,
    };
  }

  // Merge with existing profile - user data takes precedence
  const update: ProfileUpdate = {};

  // Interests: merge with existing
  update.interests = mergeArrays(
    existingProfile.interests,
    githubData.inferredInterests,
  );

  // GitHub URL: always update to latest
  update.github_url = githubData.githubUrl;

  // Bio: only suggest if empty
  // (User can see suggestion and manually apply it)

  return update;
}

/**
 * Check if profile should be updated with GitHub data
 * Returns true if significant new data is available
 */
export function shouldUpdateProfile(
  existingProfile: Profile,
  githubData: GitHubProfileData,
): boolean {
  // Check if there are new interests
  const existingInterests = new Set(
    (existingProfile.interests || []).map((s) => s.toLowerCase()),
  );
  const newInterests = githubData.inferredInterests.filter(
    (s) => !existingInterests.has(s.toLowerCase()),
  );

  if (newInterests.length >= 2) return true;

  return false;
}

/**
 * Get profile suggestions from GitHub data
 * Returns suggestions that user can review and apply
 */
export function getProfileSuggestions(
  existingProfile: Profile | null,
  githubData: GitHubProfileData,
): {
  suggestedBio: string | null;
  suggestedSkills: string[];
  suggestedInterests: string[];
} {
  const existingInterests = new Set(
    (existingProfile?.interests || []).map((s) => s.toLowerCase()),
  );

  // Return all GitHub skills as suggestions (no dedup against profile —
  // old skills/skill_levels columns have been dropped)
  const suggestedSkills = [
    ...githubData.primaryLanguages,
    ...githubData.inferredSkills,
  ];

  const suggestedInterests = githubData.inferredInterests.filter(
    (s) => !existingInterests.has(s.toLowerCase()),
  );

  // Only suggest bio if current is empty or very short
  const suggestedBio =
    !existingProfile?.bio || existingProfile.bio.length < 20
      ? githubData.suggestedBio
      : null;

  return {
    suggestedBio,
    suggestedSkills: suggestedSkills.slice(0, 10),
    suggestedInterests: suggestedInterests.slice(0, 5),
  };
}
