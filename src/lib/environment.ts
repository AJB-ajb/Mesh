/**
 * Environment detection utilities.
 */

/**
 * The production URL for the app.
 */
import { PRODUCTION_URL } from "./constants";

/**
 * Check if the app is running in production.
 * Production is defined as the main deployment URL: https://mesh-it.vercel.app/
 *
 * This checks multiple sources:
 * 1. NEXT_PUBLIC_VERCEL_URL (available client and server-side)
 * 2. VERCEL_URL (server-side only)
 * 3. Request headers (for runtime detection)
 */
export function isProduction(): boolean {
  // Check NEXT_PUBLIC_VERCEL_URL (available everywhere)
  if (process.env.NEXT_PUBLIC_VERCEL_URL === PRODUCTION_URL) {
    return true;
  }

  // Check VERCEL_URL (server-side)
  if (process.env.VERCEL_URL === PRODUCTION_URL) {
    return true;
  }

  // For browser environment, check window.location
  if (typeof window !== "undefined") {
    return window.location.hostname === PRODUCTION_URL;
  }

  return false;
}

/**
 * Get environment display name for UI and debugging.
 */
export function getEnvironmentName(): string {
  if (isProduction()) return "Production";

  // Check for Vercel preview deployments
  if (process.env.VERCEL_URL && process.env.VERCEL_URL !== PRODUCTION_URL) {
    return "Preview";
  }

  return "Development";
}
