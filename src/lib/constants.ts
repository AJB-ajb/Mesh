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

/** AI model identifiers */
export const AI_MODELS = {
  CONVERSATION: "gemini-2.0-flash",
  GEMINI_FLASH: "gemini-2.0-flash",
} as const;

/** Default pagination limits */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_MATCHES: 10,
} as const;
