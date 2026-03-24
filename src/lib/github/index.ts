/**
 * GitHub Integration Module
 * Main entry point for GitHub profile enrichment
 */

// Types
export type {
  GitHubRepo,
  GitHubCommit,
  GitHubUser,
  GitHubContent,
  GitHubExtraction,
  CodeSnippet,
  ReadmeContent,
  GitHubAnalysisInput,
  GitHubAnalysisOutput,
  GitHubProfileData,
  GitHubProfileRow,
  GitHubProfileInsert,
} from "./types";

// API Client
export {
  fetchGitHubUser,
  fetchUserRepos,
  fetchRepoLanguages,
  fetchRepoCommits,
  fetchRepoReadme,
  fetchFileContent,
  fetchCommitFile,
  fetchCommitDetails,
  checkTokenScopes,
  getRateLimitStatus,
  GitHubAPIError,
} from "./api";

// Extraction
export {
  extractGitHubProfile,
  getSortedLanguages,
  calculateActivityLevel,
  estimateExperienceFromMetrics,
  prepareAnalysisInput,
} from "./extraction";

// Analysis
export {
  analyzeGitHubProfile,
  analyzeGitHubProfileQuick,
  validateAnalysisOutput,
} from "./analysis";

// Merger
export {
  buildGitHubProfileData,
  shouldUpdateProfile,
  getProfileSuggestions,
} from "./merger";

// Database
export {
  saveGitHubProfile,
  getGitHubProfile,
  updateSyncStatus,
  isSyncNeeded,
  getUserProfile,
} from "./db";
