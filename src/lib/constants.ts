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
