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
import { seedPostingDirect } from "../utils/seed-helpers";
import { supabaseAdmin } from "../utils/supabase";

// ---------------------------------------------------------------------------
// 1. Public Profile Visibility
// ---------------------------------------------------------------------------

test.describe("Cross-user profile visibility", () => {
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
      await supabaseAdmin
        .from("skill_nodes")
        .upsert(
          {
            id: "e2e00000-0000-0000-0000-000000000001",
            name: "E2E Skill: Rust",
          },
          { onConflict: "id" },
        );

      await supabaseAdmin
        .from("profile_skills")
        .upsert(
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

      await supabaseAdmin
        .from("skill_nodes")
        .upsert(
          {
            id: "e2e00000-0000-0000-0000-000000000002",
            name: "E2E Skill: Elixir",
          },
          { onConflict: "id" },
        );

      await supabaseAdmin
        .from("profile_skills")
        .upsert(
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
// 2. Chat / Direct Messaging
// ---------------------------------------------------------------------------

test.describe("Cross-user messaging", () => {
  test("two connected users can exchange messages", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    if (!supabaseAdmin) throw new Error("Admin client required");

    // Seed a friendship between the two users so they appear in connections
    await supabaseAdmin.from("friendships").insert({
      user_id: ownerUser.id,
      friend_id: developerUser.id,
      status: "accepted",
    });

    try {
      // --- Owner navigates to connections and opens chat with developer ---
      await ownerPage.goto(`/connections?user=${developerUser.id}`);

      // Wait for the connections page to load
      await ownerPage
        .waitForLoadState("networkidle", { timeout: 10000 })
        .catch(() => {});

      // The developer's name should appear somewhere (in the list or chat header)
      await expect(
        ownerPage.locator(`text=${developerUser.full_name}`).first(),
      ).toBeVisible({ timeout: 10000 });

      // Find the message input — could be a textarea or input
      const messageInput = ownerPage
        .locator(
          'textarea, input[placeholder*="message" i], input[placeholder*="type" i]',
        )
        .first();
      await expect(messageInput).toBeVisible({ timeout: 10000 });

      // Owner sends a message
      await messageInput.fill("Hello from the E2E owner!");
      await messageInput.press("Enter");

      // The sent message should appear in the chat
      await expect(
        ownerPage.locator("text=Hello from the E2E owner!"),
      ).toBeVisible({ timeout: 10000 });

      // --- Developer navigates to connections and sees the message ---
      await developerPage.goto(`/connections?user=${ownerUser.id}`);
      await developerPage
        .waitForLoadState("networkidle", { timeout: 10000 })
        .catch(() => {});

      // Developer should see the owner's message (appears in both chat list preview and message body)
      await expect(
        developerPage.locator("text=Hello from the E2E owner!").first(),
      ).toBeVisible({ timeout: 15000 });

      // Developer replies
      const devMessageInput = developerPage
        .locator(
          'textarea, input[placeholder*="message" i], input[placeholder*="type" i]',
        )
        .first();
      await expect(devMessageInput).toBeVisible({ timeout: 10000 });
      await devMessageInput.fill("Reply from the developer!");
      await devMessageInput.press("Enter");

      // Developer sees their own message
      await expect(
        developerPage.locator("text=Reply from the developer!"),
      ).toBeVisible({ timeout: 10000 });
    } finally {
      // Cleanup friendship
      await supabaseAdmin
        .from("friendships")
        .delete()
        .or(`user_id.eq.${ownerUser.id},user_id.eq.${developerUser.id}`);
    }
  });

  test("non-participant cannot see another pair's messages", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    if (!supabaseAdmin) throw new Error("Admin client required");

    // Create a conversation between owner and developer via admin,
    // then verify from a third perspective (we'll check the developer
    // can't see messages they didn't send or receive in a different conversation).
    // Since we only have 2 test users, we test that the owner can't see
    // developer's self-conversation by creating a conversation where owner
    // is NOT a participant.

    // Create a third user just for this test
    const { data: thirdUserData } = await supabaseAdmin.auth.admin.createUser({
      email: `e2e-third-${Date.now()}@test.com`,
      password: "TestPass123",
      email_confirm: true,
      user_metadata: { full_name: "Third User" },
    });
    const thirdUserId = thirdUserData.user?.id;
    if (!thirdUserId) throw new Error("Failed to create third user");

    await supabaseAdmin
      .from("profiles")
      .upsert(
        { user_id: thirdUserId, full_name: "Third User" },
        { onConflict: "user_id" },
      );

    // Conversation between developer and third user (owner is excluded)
    const { data: conv } = await supabaseAdmin
      .from("conversations")
      .insert({
        participant_1: developerUser.id,
        participant_2: thirdUserId,
      })
      .select("id")
      .single();

    if (!conv) throw new Error("Failed to seed conversation");

    await supabaseAdmin.from("messages").insert({
      conversation_id: conv.id,
      sender_id: developerUser.id,
      content: "Secret message not for owner",
    });

    try {
      // Owner navigates to connections — should not see the secret conversation
      await ownerPage.goto("/connections");
      await ownerPage
        .waitForLoadState("networkidle", { timeout: 10000 })
        .catch(() => {});

      // The secret message should NOT appear anywhere
      await expect(
        ownerPage.locator("text=Secret message not for owner"),
      ).not.toBeVisible({ timeout: 3000 });
    } finally {
      // Cleanup
      await supabaseAdmin
        .from("messages")
        .delete()
        .eq("conversation_id", conv.id);
      await supabaseAdmin.from("conversations").delete().eq("id", conv.id);
      await supabaseAdmin.auth.admin.deleteUser(thirdUserId);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Posting Visibility
// ---------------------------------------------------------------------------

test.describe("Posting visibility rules", () => {
  test("open posting is visible to any authenticated user on discover", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    // Seed a public open posting by owner
    const posting = await seedPostingDirect({
      creator_id: ownerUser.id,
      title: "E2E Visibility: Open Project",
      description: "This posting should be visible to all authenticated users.",
      category: "personal",
      status: "open",
      team_size_min: 1,
      team_size_max: 3,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    try {
      // Developer navigates directly to the posting detail page
      await developerPage.goto(`/postings/${posting.id}`);

      // Posting title should be visible
      await expect(
        developerPage.locator("h1:has-text('E2E Visibility: Open Project')"),
      ).toBeVisible({ timeout: 10000 });

      // Description should be visible
      await expect(
        developerPage.locator("text=should be visible to all authenticated"),
      ).toBeVisible();
    } finally {
      if (supabaseAdmin) {
        await supabaseAdmin.from("postings").delete().eq("id", posting.id);
      }
    }
  });

  test("filled posting is not visible to uninvolved user", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    // Seed a filled posting — should not be discoverable
    const posting = await seedPostingDirect({
      creator_id: ownerUser.id,
      title: "E2E Visibility: Filled Project",
      description: "This posting is filled and should not be visible.",
      category: "personal",
      status: "filled",
      team_size_min: 1,
      team_size_max: 2,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    try {
      // Developer tries to navigate to the filled posting
      await developerPage.goto(`/postings/${posting.id}`);

      // Should get a 404 or "not found" since the developer has no relationship
      // to this filled posting (not an accepted applicant)
      const notFoundIndicator = developerPage.locator(
        "text=not found, text=404, text=doesn't exist",
      );
      const postingTitle = developerPage.locator(
        "h1:has-text('E2E Visibility: Filled Project')",
      );

      // Either the page shows "not found" OR the title is not visible
      // (some apps redirect to discover instead of showing 404)
      const titleVisible = await postingTitle
        .isVisible({ timeout: 5000 })
        .catch(() => false);
      expect(titleVisible).toBe(false);
    } finally {
      if (supabaseAdmin) {
        await supabaseAdmin.from("postings").delete().eq("id", posting.id);
      }
    }
  });
});
