/**
 * E2E: Complete Onboarding to Matching Flow
 * Tests critical user journey from signup to finding matches
 */

import { test, expect } from "@playwright/test";
import { createUser } from "../utils/factories/user-factory";
import { createProject } from "../utils/factories/project-factory";
import { seedProject } from "../utils/seed-helpers";
// Note: API mocking infrastructure available in ../utils/mock-api.ts
// Currently using real API keys in CI (see .github/workflows/ci.yml)

test.describe("Critical Path: Onboarding to Matching", () => {
  test("user can complete onboarding and find matches", async ({
    page,
    request,
  }) => {
    const user = createUser({ email: `test-${Date.now()}@meshit.test` });

    // STEP 1: Sign up
    await page.goto("/signup");
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="password"]', user.password);
    await page.fill('[name="confirm_password"]', user.password);
    await page.click('[type="submit"]');

    // Should redirect to onboarding
    await expect(page).toHaveURL("/onboarding");

    // STEP 2: Complete text-based onboarding
    const profileDescription = `
      I'm a senior full-stack developer with 5 years of experience in React, Node.js, and TypeScript.
      I'm looking for part-time projects (15-20 hours/week) and prefer async collaboration.
      My main interests are web development, AI/ML integration, and building scalable systems.
    `;

    await page.fill('[data-testid="profile-description"]', profileDescription);
    await page.click('[data-testid="extract-profile"]');

    // Wait for AI extraction
    await page.waitForSelector('[data-testid="extracted-preview"]', {
      timeout: 10000,
    });

    // Verify extraction preview
    await expect(page.getByText("React")).toBeVisible();
    await expect(page.getByText("Node.js")).toBeVisible();
    await expect(page.getByText("TypeScript")).toBeVisible();

    // Save profile
    await page.click('[data-testid="save-profile"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByText(`Welcome, ${user.full_name}`)).toBeVisible();

    // STEP 3: Seed matching projects in background
    const matchingProject = createProject({
      title: "Build Modern Web App",
      required_skills: ["React", "TypeScript", "Node.js"],
      experience_level: "advanced",
      status: "open",
    });
    await seedProject(request, matchingProject);

    // STEP 4: Navigate to matches
    await page.click('[data-testid="nav-matches"]');
    await expect(page).toHaveURL("/matches");

    // Wait for matches to load
    await page.waitForSelector('[data-testid="match-card"]', {
      timeout: 15000,
    });

    // Verify match displayed
    const matchCard = page.locator('[data-testid="match-card"]').first();
    await expect(matchCard).toBeVisible();

    // Verify match score displayed
    await expect(matchCard.getByText(/%/)).toBeVisible(); // Should show percentage

    // STEP 5: View match details
    await matchCard.click();

    // Should navigate to match detail page
    await expect(page).toHaveURL(/\/matches\/.+/);

    // Verify match explanation
    await expect(
      page.getByText(/skill overlap|experience match/i),
    ).toBeVisible();

    // Verify score breakdown
    await expect(page.getByTestId("score-breakdown")).toBeVisible();

    // STEP 6: Apply to match
    await page.click('[data-testid="apply-button"]');

    // Verify application success
    await expect(
      page.getByText(/application sent|applied successfully/i),
    ).toBeVisible();

    // Button should change state
    await expect(page.getByTestId("apply-button")).toBeDisabled();
    await expect(page.getByText(/applied|pending/i)).toBeVisible();
  });

  test("onboarding shows error for incomplete profile", async ({ page }) => {
    const user = createUser({ email: `test-${Date.now()}@meshit.test` });

    await page.goto("/signup");
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="password"]', user.password);
    await page.fill('[name="confirm_password"]', user.password);
    await page.click('[type="submit"]');

    await expect(page).toHaveURL("/onboarding");

    // Try to submit with minimal input
    await page.fill('[data-testid="profile-description"]', "hello");
    await page.click('[data-testid="extract-profile"]');

    // Should show validation error or warning
    await expect(
      page.getByText(/provide more details|description too short/i),
    ).toBeVisible();
  });

  test("user sees empty state when no matches exist", async ({ page }) => {
    const user = createUser({ email: `test-${Date.now()}@meshit.test` });

    // Complete onboarding with very specific skills
    await page.goto("/signup");
    await page.fill('[name="email"]', user.email);
    await page.fill('[name="password"]', user.password);
    await page.fill('[name="confirm_password"]', user.password);
    await page.click('[type="submit"]');

    await expect(page).toHaveURL("/onboarding");

    const profileDescription = `
      I specialize exclusively in COBOL and Fortran for mainframe systems.
      I only work on legacy banking software.
    `;

    await page.fill('[data-testid="profile-description"]', profileDescription);
    await page.click('[data-testid="extract-profile"]');
    await page.waitForSelector('[data-testid="extracted-preview"]');
    await page.click('[data-testid="save-profile"]');

    // Navigate to matches
    await page.click('[data-testid="nav-matches"]');
    await expect(page).toHaveURL("/matches");

    // Should see empty state
    await expect(
      page.getByText(/no matches found|check back later/i),
    ).toBeVisible();
  });
});
