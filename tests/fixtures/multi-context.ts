/**
 * Multi-context test fixture.
 * Provides two independent browser contexts with separate cookie jars,
 * allowing simultaneous owner and developer sessions without logout/login.
 */

import { test as base, type BrowserContext, type Page } from "@playwright/test";
import { setupAuthenticatedUser, cleanupTestUser } from "../utils/auth-helpers";
import { supabaseAdmin } from "../utils/supabase";
import type { TestUser } from "../utils/factories/user-factory";

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
      const context = await browser.newContext();
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
    async ({ ownerPage }, use) => {
      const user = await setupAuthenticatedUser(ownerPage, {
        persona: "project_owner",
      });
      await ensureProfile(user.id, user.full_name);
      await use(user);
      await cleanupTestUser(user.id);
    },
    { scope: "test" },
  ],

  developerContext: [
    async ({ browser }, use) => {
      const context = await browser.newContext();
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
    async ({ developerPage }, use) => {
      const user = await setupAuthenticatedUser(developerPage, {
        persona: "developer",
      });
      await ensureProfile(user.id, user.full_name);
      await use(user);
      await cleanupTestUser(user.id);
    },
    { scope: "test" },
  ],
});

export { expect, type Page } from "@playwright/test";
