/**
 * Discover Page Filtering E2E Tests
 *
 * Tests the discover page's search, category filtering, and sort controls.
 * Seeds test postings via Supabase admin API to ensure deterministic data.
 */

import { test, expect } from "../fixtures/authenticated";
import {
  seedUser,
  seedPostingDirect,
  cleanupTestData,
} from "../utils/seed-helpers";
import { createUser } from "../utils/factories/user-factory";

// Shared seed data — each test creates its own owner + postings and cleans up.

test.describe("Discover Filtering", () => {
   
  test("discover page loads with heading and search input", async ({
    developerPage,
    developerUser,
  }) => {
    await developerPage.goto("/discover");

    // Page heading
    await expect(
      developerPage.getByRole("heading", { name: "Discover" }),
    ).toBeVisible({ timeout: 10000 });

    // Search input
    const searchInput = developerPage.locator('input[type="search"]');
    await expect(searchInput).toBeVisible();

    // Category chips should be visible — at least "All" chip
    const allChip = developerPage.locator(
      'button[aria-pressed="true"]:has-text("All")',
    );
    await expect(allChip).toBeVisible();
  });

   
  test("can filter postings by category chip", async ({
    developerPage,
    developerUser,
  }) => {
    // Seed an owner with two postings of different categories
    const ownerData = createUser({ full_name: "E2E Filter Owner" });
    const { userId: ownerId } = await seedUser(ownerData, {
      persona: "project_owner",
    });

    try {
      await seedPostingDirect({
        creator_id: ownerId,
        title: "E2E Hackathon Project Alpha",
        description: "A hackathon project for testing category filters.",
        skills: ["Python"],
        category: "hackathon",
        status: "open",
        team_size_min: 1,
        team_size_max: 3,
      });

      await seedPostingDirect({
        creator_id: ownerId,
        title: "E2E Study Group Beta",
        description: "A study group for testing category filters.",
        skills: ["Math"],
        category: "study",
        status: "open",
        team_size_min: 1,
        team_size_max: 5,
      });

      await developerPage.goto("/discover");

      // Wait for postings to load — look for at least one of our seeded postings
      await expect(
        developerPage
          .locator(
            "text=E2E Hackathon Project Alpha, text=E2E Study Group Beta",
          )
          .first(),
      ).toBeVisible({ timeout: 10000 });

      // Click the "Hackathon" category chip
      const hackathonChip = developerPage.locator(
        'button:has-text("Hackathon")',
      );
      await hackathonChip.click();

      // Wait for the filter to apply
      await developerPage.waitForTimeout(500);

      // The hackathon posting should be visible
      await expect(
        developerPage.locator("text=E2E Hackathon Project Alpha"),
      ).toBeVisible();

      // The study posting should NOT be visible (filtered out)
      await expect(
        developerPage.locator("text=E2E Study Group Beta"),
      ).toBeHidden();

      // Switch to "Study" category
      const studyChip = developerPage.locator('button:has-text("Study")');
      await studyChip.click();
      await developerPage.waitForTimeout(500);

      // Now the study posting should be visible
      await expect(
        developerPage.locator("text=E2E Study Group Beta"),
      ).toBeVisible();

      // And the hackathon posting should be hidden
      await expect(
        developerPage.locator("text=E2E Hackathon Project Alpha"),
      ).toBeHidden();

      // Switch back to "All" — both should be visible
      const allChip = developerPage.locator('button:has-text("All")');
      await allChip.click();
      await developerPage.waitForTimeout(500);

      await expect(
        developerPage.locator("text=E2E Hackathon Project Alpha"),
      ).toBeVisible();
      await expect(
        developerPage.locator("text=E2E Study Group Beta"),
      ).toBeVisible();
    } finally {
      await cleanupTestData(ownerId);
    }
  });

   
  test("can search postings by text", async ({
    developerPage,
    developerUser,
  }) => {
    // Seed two distinct postings to search through
    const ownerData = createUser({ full_name: "E2E Search Owner" });
    const { userId: ownerId } = await seedUser(ownerData, {
      persona: "project_owner",
    });

    try {
      await seedPostingDirect({
        creator_id: ownerId,
        title: "E2E Quantum Computing Research",
        description: "Research group exploring quantum algorithms.",
        skills: ["Quantum Computing"],
        category: "study",
        status: "open",
        team_size_min: 1,
        team_size_max: 3,
      });

      await seedPostingDirect({
        creator_id: ownerId,
        title: "E2E Mobile Game Development",
        description: "Building a puzzle game for iOS.",
        skills: ["Swift", "SpriteKit"],
        category: "personal",
        status: "open",
        team_size_min: 1,
        team_size_max: 2,
      });

      await developerPage.goto("/discover");

      // Wait for postings to load
      await expect(
        developerPage
          .locator(
            "text=E2E Quantum Computing Research, text=E2E Mobile Game Development",
          )
          .first(),
      ).toBeVisible({ timeout: 10000 });

      // Type a search query
      const searchInput = developerPage.locator('input[type="search"]');
      await searchInput.fill("Quantum");

      // Wait for filter to apply (client-side filtering)
      await developerPage.waitForTimeout(500);

      // The quantum posting should be visible
      await expect(
        developerPage.locator("text=E2E Quantum Computing Research"),
      ).toBeVisible();

      // The game posting should not be visible
      await expect(
        developerPage.locator("text=E2E Mobile Game Development"),
      ).toBeHidden();

      // Clear the search
      await searchInput.clear();
      await developerPage.waitForTimeout(500);

      // Both should be visible again
      await expect(
        developerPage.locator("text=E2E Quantum Computing Research"),
      ).toBeVisible();
      await expect(
        developerPage.locator("text=E2E Mobile Game Development"),
      ).toBeVisible();
    } finally {
      await cleanupTestData(ownerId);
    }
  });

   
  test("sort control is visible and can toggle between options", async ({
    developerPage,
    developerUser,
  }) => {
    await developerPage.goto("/discover");

    // Wait for page to load
    await expect(
      developerPage.getByRole("heading", { name: "Discover" }),
    ).toBeVisible({ timeout: 10000 });

    // The sort select should be visible — it defaults to "Most recent"
    const sortTrigger = developerPage.locator(
      'button[role="combobox"]:has-text("Most recent")',
    );
    await expect(sortTrigger).toBeVisible();

    // Click to open the sort dropdown
    await sortTrigger.click();

    // Both options should appear
    const bestMatchOption = developerPage.getByRole("option", {
      name: "Best match",
    });
    await expect(bestMatchOption).toBeVisible();

    // Select "Best match"
    await bestMatchOption.click();

    // The trigger should now show "Best match"
    await expect(
      developerPage.locator('button[role="combobox"]:has-text("Best match")'),
    ).toBeVisible();
  });

   
  test("saved filter toggle works", async ({
    developerPage,
    developerUser,
  }) => {
    await developerPage.goto("/discover");

    // Wait for the page to load
    await expect(
      developerPage.getByRole("heading", { name: "Discover" }),
    ).toBeVisible({ timeout: 10000 });

    // The "Saved" toggle button should be visible
    const savedToggle = developerPage.locator(
      'button[aria-pressed]:has-text("Saved")',
    );
    await expect(savedToggle).toBeVisible();

    // Initially not pressed
    await expect(savedToggle).toHaveAttribute("aria-pressed", "false");

    // Click to activate
    await savedToggle.click();

    // Should now be pressed
    await expect(savedToggle).toHaveAttribute("aria-pressed", "true");

    // When no bookmarks exist, the empty state should appear
    await expect(developerPage.locator("text=No saved postings")).toBeVisible({
      timeout: 5000,
    });

    // Click again to deactivate
    await savedToggle.click();
    await expect(savedToggle).toHaveAttribute("aria-pressed", "false");
  });
});
