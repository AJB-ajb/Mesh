/**
 * Auth Helpers
 * Utilities for authentication in E2E tests.
 *
 * Uses standalone Supabase client (not Next.js server client)
 * so it works in Playwright's Node.js context.
 */

import { type Page } from "@playwright/test";
import { supabaseAdmin } from "./supabase";
import { createUser, type TestUser } from "./factories/user-factory";

/**
 * Login a user via the UI (tests actual login flow).
 * The user must already exist in Supabase auth.
 */
export async function loginAsUser(
  page: Page,
  userData: Partial<TestUser> = {},
): Promise<TestUser> {
  const user = createUser(userData);

  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');

  await page.waitForURL("**/spaces", {
    timeout: 10000,
    waitUntil: "domcontentloaded",
  });

  return user;
}

/**
 * Logout via UI.
 */
export async function logout(page: Page): Promise<void> {
  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  const signOutButton = page
    .locator("main")
    .locator('button:has-text("Sign out")');
  await signOutButton.click({ timeout: 10000 });
  await page.waitForURL("**/login", {
    timeout: 5000,
    waitUntil: "domcontentloaded",
  });
}

/**
 * Clean up a test user and all associated data.
 * Uses admin API — cascading deletes handle profiles, projects, etc.
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  if (!supabaseAdmin) {
    console.warn("No SUPABASE_SECRET_KEY — skipping cleanup");
    return;
  }

  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (err) {
    console.warn(`Failed to cleanup user ${userId}:`, err);
  }
}
