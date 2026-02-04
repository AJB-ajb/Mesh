/**
 * Auth Helpers
 * Utilities for authentication in E2E tests.
 *
 * Uses standalone Supabase client (not Next.js server client)
 * so it works in Playwright's Node.js context.
 */

import { Page } from "@playwright/test";
import { supabaseAdmin } from "./supabase";
import { createUser, type TestUser } from "./factories/user-factory";

/**
 * Login a user via the UI (tests actual login flow).
 * The user must already exist in Supabase auth.
 */
export async function loginAsUser(
  page: Page,
  userData: Partial<TestUser> = {}
): Promise<TestUser> {
  const user = createUser(userData);

  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');

  await page.waitForURL("**/dashboard", { timeout: 10000 });

  return user;
}

/**
 * Create a user account via Supabase Admin API and log in via UI.
 * This is the reliable auth setup method — it goes through the real
 * login flow so cookies are properly set for server-side auth.
 */
export async function setupAuthenticatedUser(
  page: Page,
  userData: Partial<TestUser> & { persona?: string } = {}
): Promise<TestUser & { id: string }> {
  const user = createUser(userData);
  const persona = userData.persona ?? "developer";

  if (!supabaseAdmin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY required for setupAuthenticatedUser"
    );
  }

  // Create user via admin API (auto-confirms email)
  const { data: authData, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        full_name: user.full_name,
        persona,
      },
    });

  if (createError) {
    throw new Error(`Failed to create test user: ${createError.message}`);
  }

  const userId = authData.user.id;

  // Login via UI so cookies are properly set for SSR auth
  await page.goto("/login");
  await page.fill('input[type="email"]', user.email);
  await page.fill('input[type="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });

  return { ...user, id: userId };
}

/**
 * Logout via UI.
 */
export async function logout(page: Page): Promise<void> {
  await page.goto("/settings");
  const signOutButton = page.locator(
    'button:has-text("Sign out"), [data-testid="settings-signout-button"]'
  );
  if (await signOutButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await signOutButton.click();
    await page.waitForURL("**/login", { timeout: 5000 });
  }
}

/**
 * Clean up a test user and all associated data.
 * Uses admin API — cascading deletes handle profiles, projects, etc.
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  if (!supabaseAdmin) {
    console.warn("No SUPABASE_SERVICE_ROLE_KEY — skipping cleanup");
    return;
  }

  try {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (err) {
    console.warn(`Failed to cleanup user ${userId}:`, err);
  }
}
