import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("landing page has navigation links", async ({ page }) => {
    await page.goto("/");

    // Header has login link
    const loginLink = page.locator('header a[href="/login"]');
    await expect(loginLink).toBeVisible();

    // CTA buttons link to login and why page
    await expect(
      page.locator('a[href*="/login"]:has-text("Post something")').first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/why"]:has-text("Why Mesh?")').first(),
    ).toBeVisible();
  });

  test('landing page has "How it works" section', async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("text=How it works")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Describe your activity" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Find or invite the right people",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Start doing the thing" }),
    ).toBeVisible();
  });

  test("landing page footer links are present", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('footer a[href="/privacy"]')).toBeVisible();
    await expect(page.locator('footer a[href="/terms"]')).toBeVisible();
  });

  test("unauthenticated users are redirected from protected routes", async ({
    page,
  }) => {
    await page.context().clearCookies();

    await page.goto("/spaces");
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
