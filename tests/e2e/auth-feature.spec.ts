/**
 * Authentication Security Boundary Tests
 *
 * Tests that catch real auth bugs: credential validation, session lifecycle,
 * route protection, and API auth guards. UI existence checks removed —
 * those break on copy changes, not on bugs.
 */

import { test, expect } from "@playwright/test";
import { loginAsUser, logout } from "../utils/auth-helpers";

test.describe("Auth security boundaries", () => {
  test("valid credentials → redirect to /spaces", async ({ page }) => {
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!password, "TEST_USER_PASSWORD not set — run seed-test-users");

    await loginAsUser(page, {
      email: "ajb60721@gmail.com",
      password: password!,
    });

    expect(page.url()).toContain("/spaces");
  });

  test("invalid credentials → error shown, no redirect", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[type="email"]', "wrong@example.com");
    await page.fill('input[type="password"]', "wrongpassword");
    await page.click('button:has-text("Sign in")');

    await expect(
      page.locator('.text-destructive, [class*="error"]'),
    ).toBeVisible({ timeout: 5000 });

    // Still on login page — didn't redirect
    expect(page.url()).toContain("/login");
  });

  test("protected routes redirect unauthenticated users to /login", async ({
    page,
  }) => {
    await page.context().clearCookies();

    const protectedRoutes = ["/spaces", "/activity", "/settings", "/profile"];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 10000 });
      expect(page.url()).toContain("/login");
    }
  });

  test("logout clears session — protected pages become inaccessible", async ({
    page,
  }) => {
    const password = process.env.TEST_USER_PASSWORD;
    test.skip(!password, "TEST_USER_PASSWORD not set — run seed-test-users");

    await loginAsUser(page, {
      email: "ajb60721@gmail.com",
      password: password!,
    });

    await logout(page);
    expect(page.url()).toContain("/login");

    // Session is truly gone — can't access protected route
    await page.goto("/spaces");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("API returns 401 when not authenticated", async ({ request }) => {
    const response = await request.get("/api/spaces");
    expect(response.status()).toBe(401);
  });
});
