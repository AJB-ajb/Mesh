import { test as setup, expect } from "@playwright/test";

const authFile = "tests/.auth/user.json";

setup("authenticate as test user", async ({ page }) => {
  // Allow extra time for cold dev-server compilation
  setup.setTimeout(60_000);

  const password = process.env.TEST_USER_PASSWORD;
  if (!password) {
    setup.skip();
    return;
  }

  await page.goto("/login");
  await page.locator('input[type="email"]').fill("ajb60721@gmail.com");
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/spaces", {
    timeout: 30000,
    waitUntil: "domcontentloaded",
  });
  await page.context().storageState({ path: authFile });
});
