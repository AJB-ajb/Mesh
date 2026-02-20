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

// ---------------------------------------------------------------------------
// New structured types for the redesigned profile form
// ---------------------------------------------------------------------------

export type SkillLevel = {
  name: string;
  level: number;
};

export type LocationMode = "remote" | "in_person" | "either";

/** day key → array of time-of-day slots that are toggled on */
export type AvailabilitySlots = Record<string, string[]>;

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const DAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const TIME_SLOTS = ["night", "morning", "afternoon", "evening"] as const;

export const TIME_SLOT_LABELS: Record<string, string> = {
  night: "Night",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export const TIME_SLOT_RANGE_LABELS: Record<string, string> = {
  night: "12am\u20136am",
  morning: "6am\u201312pm",
  afternoon: "12pm\u20136pm",
  evening: "6pm\u201312am",
};

// ---------------------------------------------------------------------------
// Form state
// ---------------------------------------------------------------------------

export type ProfileFormState = {
  fullName: string;
  headline: string;
  bio: string;
  location: string;
  locationLat: string;
  locationLng: string;
  skills: string;
  interests: string;
  languages: string;
  portfolioUrl: string;
  githubUrl: string;
  // Structured fields
  skillLevels: SkillLevel[];
  locationMode: LocationMode;
  availabilitySlots: AvailabilitySlots;
  timezone: string;
  /** Skills selected from the skill tree (new normalized model) */
  selectedSkills: import("./skill").SelectedProfileSkill[];
};

export const defaultFormState: ProfileFormState = {
  fullName: "",
  headline: "",
  bio: "",
  location: "",
  locationLat: "",
  locationLng: "",
  skills: "",
  interests: "",
  languages: "",
  portfolioUrl: "",
  githubUrl: "",
  skillLevels: [],
  locationMode: "either",
  availabilitySlots: {},
  timezone: "",
  selectedSkills: [],
};

export const parseList = (value: string) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

/** Extracted profile matching the post-redesign DB schema */
export type ExtractedProfileV2 = {
  full_name?: string;
  headline?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  interests?: string[];
  languages?: string[];
  portfolio_url?: string;
  github_url?: string;
  skill_levels?: Record<string, number>;
  location_preference?: number;
  location_mode?: LocationMode;
  availability_slots?: Record<string, unknown>;
  availability_windows?: {
    day_of_week: number;
    start_minutes: number;
    end_minutes: number;
  }[];
  timezone?: string;
};

export type ProfileUpdateResponse = {
  success: boolean;
  updatedSourceText: string;
  extractedProfile: ExtractedProfileV2;
};

/**
 * Map extraction results to ProfileFormState.
 * Only overwrites fields that were actually extracted (non-undefined).
 */
export function mapExtractedToFormState(
  extracted: ExtractedProfileV2,
  current: ProfileFormState,
): ProfileFormState {
  let locationMode = current.locationMode;
  if (extracted.location_mode != null) {
    locationMode = extracted.location_mode;
  } else if (extracted.location_preference != null) {
    if (extracted.location_preference >= 0.8) locationMode = "remote";
    else if (extracted.location_preference <= 0.2) locationMode = "in_person";
    else locationMode = "either";
  }

  return {
    ...current,
    ...(extracted.full_name != null && { fullName: extracted.full_name }),
    ...(extracted.headline != null && { headline: extracted.headline }),
    ...(extracted.bio != null && { bio: extracted.bio }),
    ...(extracted.location != null && { location: extracted.location }),
    ...(extracted.skills != null && {
      skills: extracted.skills.join(", "),
    }),
    ...(extracted.interests != null && {
      interests: extracted.interests.join(", "),
    }),
    ...(extracted.languages != null && {
      languages: extracted.languages.join(", "),
    }),
    ...(extracted.portfolio_url != null && {
      portfolioUrl: extracted.portfolio_url,
    }),
    ...(extracted.github_url != null && { githubUrl: extracted.github_url }),
    locationMode,
    ...(extracted.availability_slots != null && {
      availabilitySlots: extracted.availability_slots as AvailabilitySlots,
    }),
    ...(extracted.timezone != null && { timezone: extracted.timezone }),
  };
}
