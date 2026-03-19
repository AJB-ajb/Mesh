/**
 * Authenticated test fixture.
 * Provides pre-authenticated pages for developer and owner personas.
 *
 * Sessions are pre-created during the setup phase (auth.setup.ts) so tests
 * never hit Supabase's auth rate limiter.
 */

import { test as base, type Page } from "@playwright/test";
import type { TestUser } from "../utils/factories/user-factory";
import {
  ownerAuthFile,
  developerAuthFile,
  loadAuthState,
} from "../utils/auth-files";

type AuthFixtures = {
  /** Page authenticated as a developer persona */
  developerPage: Page;
  /** The developer test user (includes .id for cleanup) */
  developerUser: TestUser & { id: string };
  /** Page authenticated as a project_owner persona */
  ownerPage: Page;
  /** The owner test user (includes .id for cleanup) */
  ownerUser: TestUser & { id: string };
};

export const test = base.extend<AuthFixtures>({
  developerUser: [
    async ({}, use) => {
      const { testUser } = await loadAuthState(developerAuthFile);
      await use(testUser);
    },
    { scope: "test" },
  ],

  developerPage: [
    async ({ browser }, use) => {
      const { storageState } = await loadAuthState(developerAuthFile);
      const context = await browser.newContext({ storageState });
      const page = await context.newPage();
      await use(page);
      await context.close();
    },
    { scope: "test" },
  ],

  ownerUser: [
    async ({}, use) => {
      const { testUser } = await loadAuthState(ownerAuthFile);
      await use(testUser);
    },
    { scope: "test" },
  ],

  ownerPage: [
    async ({ browser }, use) => {
      const { storageState } = await loadAuthState(ownerAuthFile);
      const context = await browser.newContext({ storageState });
      const page = await context.newPage();
      await use(page);
      await context.close();
    },
    { scope: "test" },
  ],
});

export { expect } from "@playwright/test";
