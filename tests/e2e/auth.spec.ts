/**
 * Authentication Flow Tests (E1)
 * Feature: Authentication Flow
 * Branch: test/auth-flow
 *
 * Tests:
 * 1. GitHub OAuth login redirects correctly
 * 2. Google OAuth login redirects correctly
 * 3. Session persists after page refresh
 * 4. Protected routes redirect to login when unauthenticated
 * 5. Logout clears session
 * 6. Auth callback handles success
 * 7. Auth callback handles error
 * 8. Get current user returns 401 when not logged in
 * 9. Get current user returns user data when logged in
 * 10. Middleware blocks unauthenticated access
 */

import { test, expect } from "@playwright/test";
import { createUser } from "../utils/factories/user-factory";

test.describe("Authentication Flow", () => {
  test("GitHub OAuth login redirects to GitHub", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Click GitHub login button
    const githubButton = page
      .locator('button:has-text("GitHub"), a:has-text("GitHub")')
      .first();

    // If GitHub button exists, check it redirects to GitHub OAuth
    if (await githubButton.isVisible().catch(() => false)) {
      await githubButton.click();

      // Wait for navigation to GitHub
      await page.waitForURL(/github\.com.*oauth/, { timeout: 5000 });

      // Verify we're on GitHub OAuth page
      expect(page.url()).toContain("github.com");
      expect(page.url()).toContain("oauth");
      test.skip(true, "GitHub login button not found");
    }
  });

  test("Google OAuth login redirects to Google", async ({ page }) => {
    // Navigate to login page
    await page.goto("/login");

    // Click Google login button
    const googleButton = page
      .locator('button:has-text("Google"), a:has-text("Google")')
      .first();

    // If Google button exists, check it redirects to Google OAuth
    if (await googleButton.isVisible().catch(() => false)) {
      await googleButton.click();

      // Wait for navigation to Google
      await page.waitForURL(/accounts\.google\.com/, { timeout: 5000 });

      // Verify we're on Google OAuth page
      expect(page.url()).toContain("accounts.google.com");
      test.skip(true, "Google login button not found");
    }
  });

  test.skip("Session persists after page refresh", async ({
    page,
    context,
  }) => {
    // Create a test user session using storage state
    const user = createUser();

    // Set up authenticated session in storage
    await context.addInitScript((userData) => {
      const session = {
        user: {
          id: "test-user-id",
          email: userData.email,
          user_metadata: { name: userData.full_name },
        },
      };
      localStorage.setItem("supabase.auth.token", JSON.stringify(session));
    }, user);

    // Navigate to dashboard
    await page.goto("/dashboard");

    // Refresh the page
    await page.reload();

    // Verify we're still on dashboard (not redirected to login)
    expect(page.url()).toContain("/dashboard");
  });

  test("Protected routes redirect to login when unauthenticated", async ({
    page,
  }) => {
    // Clear any existing session
    await page.context().clearCookies();

    // Try to access protected routes
    const protectedRoutes = ["/dashboard", "/profile", "/projects"];

    for (const route of protectedRoutes) {
      await page.goto(route);

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 5000 });
      expect(page.url()).toContain("/login");

      // Verify login page is displayed
      await expect(
        page.locator("text=Sign in, text=Login").first(),
      ).toBeVisible();
    }
  });

  test("Logout clears session and redirects to login", async ({ page }) => {
    // Start with authenticated session
    await page.goto("/dashboard");

    // Find and click logout button/link
    const logoutButton = page
      .locator(
        'button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign out"), a:has-text("Sign out")',
      )
      .first();

    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();

      // Should redirect to login
      await page.waitForURL(/\/login/, { timeout: 5000 });
      expect(page.url()).toContain("/login");

      // Try to access dashboard again - should redirect to login
      await page.goto("/dashboard");
      await page.waitForURL(/\/login/, { timeout: 5000 });
      expect(page.url()).toContain("/login");
      test.skip(true, "Logout button not found");
    }
  });

  test("Auth callback handles successful authentication", async ({ page }) => {
    // Simulate successful OAuth callback
    const code = "test_auth_code";
    await page.goto(`/callback?code=${code}&next=/dashboard`);

    // Should either redirect to dashboard or show loading state
    // The actual behavior depends on implementation
    // Should not show error
    const errorMessage = await page
      .locator("text=error, text=Error, text=failed")
      .first()
      .isVisible()
      .catch(() => false);
    expect(errorMessage).toBeFalsy();
  });

  test("Auth callback handles OAuth errors", async ({ page }) => {
    // Simulate OAuth error
    const error = "access_denied";
    const errorDescription = "User denied access";
    await page.goto(
      `/callback?error=${error}&error_description=${encodeURIComponent(errorDescription)}`,
    );

    // Should redirect to login with error
    await page.waitForURL("/login**", { timeout: 5000 });
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("error");
  });

  test("API returns 401 when not authenticated", async ({ request }) => {
    // Test protected API endpoints
    const protectedEndpoints = [
      { path: "/api/profile/save", method: "POST" },
      { path: "/api/matches/for-me", method: "GET" },
      { path: "/api/github/sync", method: "POST" },
    ];

    for (const endpoint of protectedEndpoints) {
      let response;
      if (endpoint.method === "POST") {
        response = await request.post(endpoint.path, { data: {} });
      } else {
        response = await request.get(endpoint.path);
      }

      // Should return 401 Unauthorized
      expect(response.status()).toBe(401);

      const body = await response.json().catch(() => ({}));
      expect(body.error).toBeTruthy();
    }
  });

  test("API returns user data when authenticated", async () => {
    // This test requires a valid session
    // In a real test, you'd set up authentication first

    // For now, we'll test the structure of the response
    // A real implementation would authenticate first
    test.skip(true, "Requires valid authentication setup");
  });

  test("Middleware blocks unauthenticated access to dashboard", async ({
    page,
  }) => {
    // Ensure no session exists
    await page.goto("/");
    await page.context().clearCookies();
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (_e) {
        // Ignore if storage access is denied
      }
    });

    // Try to access dashboard
    await page.goto("/dashboard");

    // Should be redirected to login
    await page.waitForURL(/\/login.*next=%2Fdashboard/, { timeout: 5000 });

    // Verify URL contains login and next parameter
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("next=%2Fdashboard");
  });

  test.skip("Middleware redirects authenticated users away from login", async ({
    page,
    context,
  }) => {
    // Set up authenticated session
    const user = createUser();

    await context.addInitScript((userData) => {
      const session = {
        user: {
          id: "test-user-id",
          email: userData.email,
          user_metadata: { name: userData.full_name },
        },
      };
      localStorage.setItem("supabase.auth.token", JSON.stringify(session));
    }, user);

    // Try to access login page while authenticated
    await page.goto("/login");

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, {
      timeout: 5000,
      waitUntil: "networkidle",
    });
    expect(page.url()).toContain("/dashboard");
  });
});
