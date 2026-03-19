/**
 * Cross-User Visibility E2E Tests
 *
 * Tests that users can see each other's content — profiles, postings,
 * and messages. Catches RLS policy mismatches where a query joins through
 * tables with incompatible permissions.
 *
 * Uses multi-context fixture: two independent browser sessions (owner + developer)
 * so we don't need logout/login dance.
 */

import { test, expect } from "../fixtures/multi-context";
import { supabaseAdmin } from "../utils/supabase";

// ---------------------------------------------------------------------------
// 1. Public Profile Visibility
// ---------------------------------------------------------------------------

test.describe("Cross-user profile visibility", () => {
  // Tests mutate the shared owner's profile — run serially to avoid overwriting
  test.describe.configure({ mode: "serial" });
  test("user can view another user's profile page", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    // Seed the owner's profile with skills so the joined query is exercised
    if (supabaseAdmin) {
      await supabaseAdmin
        .from("profiles")
        .update({
          headline: "E2E Cross-User Test Owner",
          bio: "Building great projects",
        })
        .eq("user_id", ownerUser.id);

      // Seed a skill node and attach it to the owner's profile
      await supabaseAdmin.from("skill_nodes").upsert(
        {
          id: "e2e00000-0000-0000-0000-000000000001",
          name: "E2E Skill: Rust",
        },
        { onConflict: "id" },
      );

      await supabaseAdmin.from("profile_skills").upsert(
        {
          profile_id: ownerUser.id,
          skill_id: "e2e00000-0000-0000-0000-000000000001",
          level: 7,
        },
        { onConflict: "profile_id,skill_id" },
      );
    }

    // Developer visits the owner's public profile
    await developerPage.goto(`/profile/${ownerUser.id}`);

    // The profile should load (not 404)
    // Check that the owner's name appears on the page
    await expect(
      developerPage.locator(`text=${ownerUser.full_name}`).first(),
    ).toBeVisible({ timeout: 10000 });

    // The headline should be visible
    await expect(
      developerPage.locator("text=E2E Cross-User Test Owner"),
    ).toBeVisible();

    // Should NOT see a 404 page
    await expect(
      developerPage.locator("text=not found", { exact: false }),
    ).not.toBeVisible();
  });

  test("user can see another user's profile skills", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    // Seed profile + skill
    if (supabaseAdmin) {
      await supabaseAdmin
        .from("profiles")
        .update({ headline: "Skill Visibility Test" })
        .eq("user_id", ownerUser.id);

      await supabaseAdmin.from("skill_nodes").upsert(
        {
          id: "e2e00000-0000-0000-0000-000000000002",
          name: "E2E Skill: Elixir",
        },
        { onConflict: "id" },
      );

      await supabaseAdmin.from("profile_skills").upsert(
        {
          profile_id: ownerUser.id,
          skill_id: "e2e00000-0000-0000-0000-000000000002",
          level: 9,
        },
        { onConflict: "profile_id,skill_id" },
      );
    }

    await developerPage.goto(`/profile/${ownerUser.id}`);

    // The skill name should be visible on the profile page
    await expect(
      developerPage.locator("text=E2E Skill: Elixir").first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("own profile page loads correctly", async ({ ownerPage, ownerUser }) => {
    // Visit own profile URL (should work the same as /profile)
    await ownerPage.goto(`/profile/${ownerUser.id}`);

    await expect(
      ownerPage.locator(`text=${ownerUser.full_name}`).first(),
    ).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// 2. Chat / Direct Messaging — REMOVED
//    The /connections page no longer exists. DMs are now spaces.
//    These tests need a full rewrite for the spaces messaging model.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 3. Posting Visibility — REMOVED
//    The /postings/:id route no longer exists. Postings are now viewed
//    within spaces at /spaces/:id. These tests need a full rewrite.
// ---------------------------------------------------------------------------
