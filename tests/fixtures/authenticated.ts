/**
 * Authenticated test fixture.
 * Provides pre-authenticated pages for developer and owner personas.
 * Handles user creation and cleanup automatically.
 */

import { test as base, type Page } from "@playwright/test";
import { setupAuthenticatedUser, cleanupTestUser } from "../utils/auth-helpers";
import type { TestUser } from "../utils/factories/user-factory";

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
    async ({ page }, use) => {
      const user = await setupAuthenticatedUser(page, {
        persona: "developer",
      });
      await use(user);
      await cleanupTestUser(user.id);
    },
    { scope: "test" },
  ],

  developerPage: [
    async ({ page }, use) => {
      // developerUser fixture already authenticated the page
      await use(page);
    },
    { scope: "test" },
  ],

  ownerUser: [
    async ({ page }, use) => {
      const user = await setupAuthenticatedUser(page, {
        persona: "project_owner",
      });
      await use(user);
      await cleanupTestUser(user.id);
    },
    { scope: "test" },
  ],

  ownerPage: [
    async ({ page }, use) => {
      // ownerUser fixture already authenticated the page
      await use(page);
    },
    { scope: "test" },
  ],
});

export { expect } from "@playwright/test";
