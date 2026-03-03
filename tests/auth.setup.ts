import { test as setup } from "@playwright/test";

const authFile = "tests/.auth/user.json";

setup("authenticate as test user", async ({ page }) => {
  const password = process.env.TEST_USER_PASSWORD;
  if (!password) {
    setup.skip();
    return;
  }

  await page.goto("/login");
  await page.fill('input[type="email"]', "ajb60721@gmail.com");
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/posts", {
    timeout: 30000,
    waitUntil: "domcontentloaded",
  });
  await page.context().storageState({ path: authFile });
});
