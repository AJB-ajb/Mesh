/**
 * Multi-context test fixture.
 * Provides two independent browser contexts with separate cookie jars,
 * allowing simultaneous owner and developer sessions without logout/login.
 *
 * Sessions are pre-created during the setup phase (auth.setup.ts) so tests
 * never hit Supabase's auth rate limiter.
 */

import { test as base, type BrowserContext, type Page } from "@playwright/test";
import { supabaseAdmin } from "../utils/supabase";
import type { TestUser } from "../utils/factories/user-factory";
import { ownerAuthFile, developerAuthFile } from "../utils/auth-files";

/** Read saved storage state + embedded test user metadata. */
async function loadAuthState(filePath: string): Promise<{
  storageState: { cookies: Array<Record<string, unknown>>; origins: unknown[] };
  testUser: TestUser & { id: string };
}> {
  const fs = await import("fs/promises");
  const raw = JSON.parse(await fs.readFile(filePath, "utf-8"));
  const { _testUser, ...storageState } = raw;
  return { storageState, testUser: _testUser };
}

/** Ensure a profile row exists so API routes don't fail with FK errors. */
async function ensureProfile(userId: string, fullName: string) {
  if (!supabaseAdmin) return;
  await supabaseAdmin
    .from("profiles")
    .upsert(
      { user_id: userId, full_name: fullName },
      { onConflict: "user_id" },
    );
}

type MultiContextFixtures = {
  ownerContext: BrowserContext;
  ownerPage: Page;
  ownerUser: TestUser & { id: string };
  developerContext: BrowserContext;
  developerPage: Page;
  developerUser: TestUser & { id: string };
};

export const test = base.extend<MultiContextFixtures>({
  ownerContext: [
    async ({ browser }, use) => {
      const { storageState } = await loadAuthState(ownerAuthFile);
      const context = await browser.newContext({ storageState });
      await use(context);
      await context.close();
    },
    { scope: "test" },
  ],

  ownerPage: [
    async ({ ownerContext }, use) => {
      const page = await ownerContext.newPage();
      await use(page);
    },
    { scope: "test" },
  ],

  ownerUser: [
    async ({}, use) => {
      const { testUser } = await loadAuthState(ownerAuthFile);
      await ensureProfile(testUser.id, testUser.full_name);
      await use(testUser);
    },
    { scope: "test" },
  ],

  developerContext: [
    async ({ browser }, use) => {
      const { storageState } = await loadAuthState(developerAuthFile);
      const context = await browser.newContext({ storageState });
      await use(context);
      await context.close();
    },
    { scope: "test" },
  ],

  developerPage: [
    async ({ developerContext }, use) => {
      const page = await developerContext.newPage();
      await use(page);
    },
    { scope: "test" },
  ],

  developerUser: [
    async ({}, use) => {
      const { testUser } = await loadAuthState(developerAuthFile);
      await ensureProfile(testUser.id, testUser.full_name);
      await use(testUser);
    },
    { scope: "test" },
  ],
});

export { expect, type Page } from "@playwright/test";
