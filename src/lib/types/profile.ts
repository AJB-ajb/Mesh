export type GitHubSyncStatus = {
  synced: boolean;
  lastSyncedAt?: string;
  syncStatus?: "pending" | "syncing" | "completed" | "failed";
  data?: {
    githubUsername: string;
    githubUrl: string;
    avatarUrl: string;
    repoCount: number;
    totalStars: number;
    primaryLanguages: string[];
    inferredSkills: string[];
    inferredInterests: string[];
    experienceLevel: string;
    experienceSignals: string[];
    codingStyle: string;
    collaborationStyle: string;
    activityLevel: string;
    suggestedBio: string;
  };
  suggestions?: {
    suggestedBio: string | null;
    suggestedSkills: string[];
    suggestedInterests: string[];
    experienceUpgrade: string | null;
  } | null;
};

export type ProfileFormState = {
  fullName: string;
  headline: string;
  bio: string;
  location: string;
  locationLat: string;
  locationLng: string;
  experienceLevel: string;
  collaborationStyle: string;
  remotePreference: string;
  availabilityHours: string;
  skills: string;
  interests: string;
  languages: string;
  projectTypes: string;
  preferredRoles: string;
  preferredStack: string;
  commitmentLevel: string;
  timelinePreference: string;
  portfolioUrl: string;
  githubUrl: string;
  filterMaxDistance: string;
  filterMinHours: string;
  filterMaxHours: string;
  filterLanguages: string;
};

export const defaultFormState: ProfileFormState = {
  fullName: "",
  headline: "",
  bio: "",
  location: "",
  locationLat: "",
  locationLng: "",
  experienceLevel: "intermediate",
  collaborationStyle: "async",
  remotePreference: "50",
  availabilityHours: "",
  skills: "",
  interests: "",
  languages: "",
  projectTypes: "",
  preferredRoles: "",
  preferredStack: "",
  commitmentLevel: "10",
  timelinePreference: "1_month",
  portfolioUrl: "",
  githubUrl: "",
  filterMaxDistance: "",
  filterMinHours: "",
  filterMaxHours: "",
  filterLanguages: "",
};

export const parseList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
