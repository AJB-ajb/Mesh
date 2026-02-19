import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("landing page has navigation links", async ({ page }) => {
    await page.goto("/");

    // Header has login link
    const loginLink = page.locator('header a[href="/login"]');
    await expect(loginLink).toBeVisible();

    // CTA buttons link to login and postings
    await expect(
      page.locator('a[href*="/login"]:has-text("Post something")').first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/my-postings"]:has-text("Explore postings")'),
    ).toBeVisible();
  });

  test('landing page has "How it works" section', async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=How it works")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Describe what you want to do" }),
    ).toBeVisible();
    await expect(page.locator("text=AI finds compatible people")).toBeVisible();
    await expect(page.locator("text=Connect and collaborate")).toBeVisible();
  });

  test("landing page footer links are present", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('footer a[href="/privacy"]')).toBeVisible();
    await expect(page.locator('footer a[href="/terms"]')).toBeVisible();
  });

  test("login page loads with email/password form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator('h1:has-text("Welcome back")')).toBeVisible();
    await expect(page.locator("input#email")).toBeVisible();
    await expect(page.locator("input#password")).toBeVisible();
    await expect(
      page.locator('button[type="submit"]:has-text("Sign in")'),
    ).toBeVisible();
  });

  test("login page has OAuth provider buttons", async ({ page }) => {
    await page.goto("/login");

    // Three OAuth buttons (Google, GitHub, LinkedIn)
    const oauthSection = page.locator("text=Or continue with");
    await expect(oauthSection).toBeVisible();

    // OAuth buttons are present
    const oauthButtons = page
      .locator('button[type="button"]')
      .filter({ has: page.locator("svg") });
    await expect(oauthButtons).toHaveCount(3);
  });

  test("login page has link to signup", async ({ page }) => {
    await page.goto("/login");

    const signupLink = page.locator('a[href="/signup"]:has-text("Sign up")');
    await expect(signupLink).toBeVisible();
  });

  test("login page has forgot password link", async ({ page }) => {
    await page.goto("/login");

    const forgotLink = page.locator('a[href="/forgot-password"]');
    await expect(forgotLink).toBeVisible();
  });

  test("unauthenticated users are redirected from protected routes", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/active");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test('landing page "Post something" button navigates to login', async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .locator('a[href*="/login"]:has-text("Post something")')
      .first()
      .click();
    await page.waitForURL(/\/login/, { timeout: 5000 });
    expect(page.url()).toContain("/login");
  });
});
