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
const anonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** Admin client with service role — use for seeding and cleanup only */
export const supabaseAdmin = serviceRoleKey
  ? createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false } })
  : null;

/** Anon client — use for user-level operations (signup, login) */
export const supabaseAnon = createClient(url, anonKey, {
  auth: { autoRefreshToken: false },
});
