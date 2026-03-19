import { test as setup } from "@playwright/test";
import { supabaseAdmin } from "./utils/supabase";
import { createUser } from "./utils/factories/user-factory";
import { authFile, ownerAuthFile, developerAuthFile } from "./utils/auth-files";

/**
 * Single login for the main test user (layout tests, etc.).
 */
setup("authenticate as test user", async ({ page }) => {
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

/**
 * Create owner + developer test users via admin API, log in via UI, and
 * save their sessions. These run sequentially in a single worker (setup
 * project) so they never hit the auth rate limiter.
 */
setup("create owner test user", async ({ page }) => {
  setup.setTimeout(60_000);

  if (!supabaseAdmin) {
    setup.skip();
    return;
  }

  const user = createUser();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name, persona: "project_owner" },
  });
  if (error) throw new Error(`Failed to create owner: ${error.message}`);

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/spaces", {
    timeout: 30000,
    waitUntil: "domcontentloaded",
  });

  const state = await page.context().storageState();
  const fs = await import("fs/promises");
  await fs.writeFile(
    ownerAuthFile,
    JSON.stringify(
      { ...state, _testUser: { ...user, id: data.user.id } },
      null,
      2,
    ),
  );
});

setup("create developer test user", async ({ page }) => {
  setup.setTimeout(60_000);

  if (!supabaseAdmin) {
    setup.skip();
    return;
  }

  const user = createUser();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name, persona: "developer" },
  });
  if (error) throw new Error(`Failed to create developer: ${error.message}`);

  await page.goto("/login");
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL("**/spaces", {
    timeout: 30000,
    waitUntil: "domcontentloaded",
  });

  const state = await page.context().storageState();
  const fs = await import("fs/promises");
  await fs.writeFile(
    developerAuthFile,
    JSON.stringify(
      { ...state, _testUser: { ...user, id: data.user.id } },
      null,
      2,
    ),
  );
});
