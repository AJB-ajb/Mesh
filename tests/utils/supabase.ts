/**
 * Standalone Supabase client for E2E test utilities.
 * Uses @supabase/supabase-js directly (not @supabase/ssr)
 * so it works in Playwright's Node.js context without Next.js APIs.
 *
 * Env vars are loaded via playwright.config.ts (which reads .env).
 */

import { createClient } from "@supabase/supabase-js";

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var ${key} for E2E tests`);
  return value;
}

const url = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = process.env.SUPABASE_SECRET_KEY;

/** Admin client with secret key — use for seeding and cleanup only */
export const supabaseAdmin = secretKey
  ? createClient(url, secretKey, { auth: { autoRefreshToken: false } })
  : null;

/** Publishable client — use for user-level operations (signup, login) */
export const supabaseAnon = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false },
});
