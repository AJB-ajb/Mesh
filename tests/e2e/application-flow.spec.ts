/**
 * Application Flow E2E Tests
 *
 * Tests the join-request lifecycle: a developer applies to an owner's posting,
 * and the owner reviews the application.
 *
 * Fixture limitation: both developerUser and ownerUser authenticate the same
 * browser page (they share `{ page }`), so we cannot have two sessions open
 * simultaneously. Instead we use a sequential approach:
 *   1. Create a posting via the Supabase admin API (seed)
 *   2. The developer (authenticated via fixture) navigates and applies
 *   3. Log out the developer, log in the owner
 *   4. The owner reviews the application
 *
 * For the two-user flow we use only the developerPage fixture and manually
 * log in/out the owner, since the fixture auth shares the same page context.
 */

import { test, expect } from "../fixtures/authenticated";
import {
  seedUser,
  seedPostingDirect,
  cleanupTestData,
} from "../utils/seed-helpers";
import { createUser } from "../utils/factories/user-factory";
import { logout, loginAsUser } from "../utils/auth-helpers";

const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

test.describe("Application Flow", () => {
  // TODO: rewrite for text-first compose flow — the apply/accept UI has changed
  test.skip("developer can apply to a posting and owner can see the request", async ({
    developerPage,
    developerUser,
  }) => {
    // --- Setup: Create a separate owner user and a posting via API ---
    const ownerUserData = createUser({ full_name: "E2E Owner User" });
    const { userId: ownerId } = await seedUser(ownerUserData, {
      persona: "project_owner",
    });

    let postingId: string | undefined;

    try {
      // Seed an open posting owned by the owner user (manual review, not auto-accept)
      const seededPosting = await seedPostingDirect({
        creator_id: ownerId,
        title: "E2E Test: Looking for Frontend Dev",
        description:
          "Need a frontend developer for a React project. Must know TypeScript.",
        category: "personal",
        status: "open",
        team_size_min: 1,
        team_size_max: 3,
        expires_at: expiresAt,
      });
      postingId = seededPosting.id;

      // --- Step 1: Developer navigates to the posting and applies ---
      await developerPage.goto(`/postings/${postingId}`);

      // Wait for the posting to load — the title should be visible
      await expect(
        developerPage.locator(
          "h1:has-text('E2E Test: Looking for Frontend Dev')",
        ),
      ).toBeVisible({ timeout: 10000 });

      // Find and click "Request to join" (manual-review posting)
      const requestButton = developerPage.getByRole("button", {
        name: "Request to join",
      });
      await expect(requestButton).toBeVisible({ timeout: 5000 });
      await requestButton.click();

      // A cover-message textarea appears for manual-review postings
      const coverTextarea = developerPage.locator("textarea").first();
      await expect(coverTextarea).toBeVisible({ timeout: 5000 });
      await coverTextarea.fill("I would love to join this project!");

      // Click the submit button in the cover-message form
      const submitButton = developerPage.getByRole("button", {
        name: "Request to join",
      });
      await submitButton.click();

      // The SmartAcceptanceCard may appear — submit it if present
      const acceptanceCard = developerPage.locator(
        'text=Request pending, text=Accepted, button:has-text("Submit")',
      );
      const hasAcceptanceCard = (await acceptanceCard.first().count()) > 0;
      if (hasAcceptanceCard) {
        const submitAcceptance = developerPage.getByRole("button", {
          name: "Submit",
        });
        if (await submitAcceptance.isVisible({ timeout: 3000 })) {
          await submitAcceptance.click();
        }
      }

      // Wait for a status indicator — either "Request pending" badge or acceptance
      const statusIndicator = developerPage
        .locator("text=Request pending, text=Accepted")
        .first();
      await expect(statusIndicator).toBeVisible({ timeout: 15000 });

      // --- Step 2: Log out developer, log in as owner ---
      await logout(developerPage);
      await loginAsUser(developerPage, {
        email: ownerUserData.email,
        password: ownerUserData.password,
      });

      // Navigate to the posting as the owner
      await developerPage.goto(`/postings/${postingId}`);

      // The owner should see the applications card with the developer's request
      // The "Join requests" heading should be visible
      const applicationsSection = developerPage.locator("text=Join requests");
      await expect(applicationsSection).toBeVisible({ timeout: 10000 });
    } finally {
      // Cleanup: delete the owner user (cascading deletes handle posting + applications)
      await cleanupTestData(ownerId);
    }
  });

  test("developer sees posting detail page with posting info", async ({
    developerPage,
    developerUser,
  }) => {
    // Create a posting via seed
    const ownerUserData = createUser({ full_name: "E2E Detail Owner" });
    const { userId: ownerId } = await seedUser(ownerUserData, {
      persona: "project_owner",
    });

    let postingId: string | undefined;

    try {
      const seededPosting = await seedPostingDirect({
        creator_id: ownerId,
        title: "E2E Test: Mobile App Project",
        description: "Building a fitness tracker with React Native.",
        category: "personal",
        status: "open",
        team_size_min: 2,
        team_size_max: 4,
        expires_at: expiresAt,
      });
      postingId = seededPosting.id;

      // Developer navigates to the posting
      await developerPage.goto(`/postings/${postingId}`);

      // Verify posting title is displayed
      await expect(
        developerPage.locator("h1:has-text('E2E Test: Mobile App Project')"),
      ).toBeVisible({ timeout: 10000 });

      // Verify description content appears
      await expect(
        developerPage.locator("text=Building a fitness tracker"),
      ).toBeVisible();
    } finally {
      await cleanupTestData(ownerId);
    }
  });
});
