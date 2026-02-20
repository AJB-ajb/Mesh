/**
 * Centralized configuration constants.
 * Values previously hardcoded across the codebase.
 */

/** Production deployment hostname */
export const PRODUCTION_URL = "mesh-it.vercel.app";

/** Voice activity detection defaults */
export const VOICE = {
  /** Audio level threshold (0-128) to consider as speech */
  ACTIVITY_THRESHOLD: 35,
  /** Milliseconds of silence before auto-stopping recording */
  SILENCE_DURATION_MS: 2500,
} as const;

/** Gemini models in fallback order for rate-limit (429) retry (free tier) */
export const GEMINI_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-2.0-flash",
] as const;

/** Default pagination limits */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_MATCHES: 10,
} as const;

/** Matching algorithm constants */
export const MATCHING = {
  /** Dimension weights for the weighted-mean score formula */
  WEIGHTS: {
    semantic: 1.0,
    availability: 1.0,
    skill_level: 0.7,
    location: 0.7,
  },
  /** Minimum score to create a match record — near-zero scores are filtered */
  MIN_SCORE_THRESHOLD: 0.05,
  /** Score color thresholds for getScoreColorVariant */
  SCORE_COLOR_SUCCESS: 0.7,
  SCORE_COLOR_WARNING: 0.5,
  /** Quality tier cutoffs for categorizeMatch */
  TIER_EXCELLENT: 0.9,
  TIER_GOOD: 0.75,
  TIER_FAIR: 0.5,
  /** Default similarity threshold for meetsThreshold */
  DEFAULT_SIMILARITY_THRESHOLD: 0.7,
  /** Default top-N results for match queries */
  DEFAULT_RESULT_LIMIT: 10,
} as const;

/** Location and geolocation constants */
export const LOCATION = {
  /** Reference distance (km) used to normalize location scores */
  MAX_REFERENCE_DISTANCE_KM: 5000,
  /** Default remote-preference midpoint (0-100 scale) */
  DEFAULT_REMOTE_PREFERENCE: 50,
  /** Divisor for computing the remote factor from summed preferences */
  REMOTE_CALC_DIVISOR: 200,
  /** Geolocation API timeout in milliseconds */
  GEOLOCATION_TIMEOUT_MS: 10000,
} as const;

/** Posting urgency thresholds */
export const URGENCY = {
  /** Hours remaining below which urgency is "critical" */
  CRITICAL_HOURS: 24,
  /** Days remaining below which urgency is "high" */
  HIGH_DAYS: 3,
  /** Days remaining below which urgency is "medium" */
  MEDIUM_DAYS: 7,
} as const;

/** Posting deadline defaults */
export const DEADLINES = {
  /** Default extension length in days when no explicit value is provided */
  DEFAULT_EXTENSION_DAYS: 7,
  /** Default repost duration in days when no explicit value is provided */
  DEFAULT_REPOST_DAYS: 7,
  /** Preset options (in days) shown in the extend-deadline UI */
  EXTEND_OPTIONS: [7, 14, 30],
} as const;

/** AI generation parameters for match explanations */
export const AI = {
  TEMPERATURE: 0.7,
  TOP_K: 40,
  TOP_P: 0.95,
  MAX_OUTPUT_TOKENS: 200,
} as const;
