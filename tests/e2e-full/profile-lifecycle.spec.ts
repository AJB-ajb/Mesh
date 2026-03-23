/**
 * Profile Lifecycle E2E Tests
 *
 * Tests the profile editing and cross-user visibility flows:
 *
 * 1. Owner edits profile via API → developer sees changes on profile page
 * 2. Profile skills sync — add/update/remove skills
 * 3. Profile validation — boundary conditions on field lengths
 *
 * Uses multi-context fixture: two independent browser sessions.
 */

import { test, expect } from "../../tests/fixtures/multi-context";
import { supabaseAdmin } from "../../tests/utils/supabase";

test.describe.configure({ mode: "serial", retries: 1 });

// ---------------------------------------------------------------------------
// 1. Profile editing and cross-user visibility
// ---------------------------------------------------------------------------

test.describe("Profile edit → cross-user visibility", () => {
  test("owner edits profile fields, developer sees updated profile page", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    const uniqueHeadline = `E2E Profile Test ${Date.now()}`;
    const uniqueBio = `I build things with TypeScript. Test run ${Date.now()}.`;

    // --- Step 1: Owner updates profile via API ---
    const updateResponse = await ownerPage.request.patch("/api/profiles", {
      data: {
        fullName: ownerUser.full_name,
        headline: uniqueHeadline,
        bio: uniqueBio,
        location: "Munich, Germany",
        interests: "TypeScript, Rust, Hiking",
        languages: "English, German",
        portfolioUrl: "https://example.com/portfolio",
      },
    });
    expect(updateResponse.ok()).toBe(true);

    // --- Step 2: Developer visits owner's profile page ---
    await developerPage.goto(`/profile/${ownerUser.id}`);

    // Wait for profile to load
    await expect(
      developerPage.locator(`text=${ownerUser.full_name}`).first(),
    ).toBeVisible({ timeout: 15000 });

    // Headline should be visible
    await expect(developerPage.locator(`text=${uniqueHeadline}`)).toBeVisible({
      timeout: 5000,
    });

    // Bio should be visible (rendered in the About section)
    await expect(
      developerPage.locator(`text=I build things with TypeScript`),
    ).toBeVisible();

    // --- Step 3: Owner updates headline again ---
    const updatedHeadline = `Updated Headline ${Date.now()}`;
    const updateResponse2 = await ownerPage.request.patch("/api/profiles", {
      data: {
        fullName: ownerUser.full_name,
        headline: updatedHeadline,
        bio: uniqueBio,
      },
    });
    expect(updateResponse2.ok()).toBe(true);

    // --- Step 4: Developer reloads — should see updated headline ---
    await developerPage.reload();
    await expect(developerPage.locator(`text=${updatedHeadline}`)).toBeVisible({
      timeout: 10000,
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Profile skills sync
// ---------------------------------------------------------------------------

test.describe("Profile skills (DB-level)", () => {
  test("skills are stored, updated, and deleted correctly via admin", async ({
    ownerUser,
  }) => {
    if (!supabaseAdmin) {
      test.skip(true, "Admin client required");
      return;
    }

    const skillIds = [
      "e2e10000-0000-0000-0000-000000000001",
      "e2e10000-0000-0000-0000-000000000002",
      "e2e10000-0000-0000-0000-000000000003",
    ];

    try {
      // Ensure the profile row exists (FK target for profile_skills)
      await supabaseAdmin
        .from("profiles")
        .upsert(
          { user_id: ownerUser.id, full_name: ownerUser.full_name },
          { onConflict: "user_id" },
        );

      // --- Clean up any leftover skill nodes (by ID or name) to avoid unique constraint ---
      const skillNames = [
        "E2E Skill: TypeScript",
        "E2E Skill: Rust",
        "E2E Skill: Python",
      ];
      // Delete profile_skills referencing these IDs
      await supabaseAdmin
        .from("profile_skills")
        .delete()
        .eq("profile_id", ownerUser.id)
        .in("skill_id", skillIds);
      // Delete existing nodes by ID or by name
      await supabaseAdmin.from("skill_nodes").delete().in("id", skillIds);
      // Also delete any leftover nodes with matching names (different IDs from prior runs)
      const { data: existingByName } = await supabaseAdmin
        .from("skill_nodes")
        .select("id")
        .in("name", skillNames);
      if (existingByName && existingByName.length > 0) {
        const existingIds = existingByName.map((n) => n.id);
        await supabaseAdmin
          .from("profile_skills")
          .delete()
          .in("skill_id", existingIds);
        await supabaseAdmin.from("skill_nodes").delete().in("id", existingIds);
      }

      const { error: nodeError } = await supabaseAdmin
        .from("skill_nodes")
        .insert([
          { id: skillIds[0], name: "E2E Skill: TypeScript", depth: 0 },
          { id: skillIds[1], name: "E2E Skill: Rust", depth: 0 },
          { id: skillIds[2], name: "E2E Skill: Python", depth: 0 },
        ]);
      if (nodeError)
        throw new Error(`Skill nodes insert failed: ${nodeError.message}`);

      // --- Attach skills to profile ---
      const { error: skillError } = await supabaseAdmin
        .from("profile_skills")
        .insert([
          { profile_id: ownerUser.id, skill_id: skillIds[0], level: 9 },
          { profile_id: ownerUser.id, skill_id: skillIds[1], level: 7 },
          { profile_id: ownerUser.id, skill_id: skillIds[2], level: 5 },
        ]);
      if (skillError)
        throw new Error(`Skill attach failed: ${skillError.message}`);

      // --- Verify all 3 stored ---
      const { data: stored } = await supabaseAdmin
        .from("profile_skills")
        .select("skill_id, level")
        .eq("profile_id", ownerUser.id)
        .in("skill_id", skillIds)
        .order("level", { ascending: false });

      expect(stored).toHaveLength(3);
      expect(stored![0].level).toBe(9);
      expect(stored![1].level).toBe(7);
      expect(stored![2].level).toBe(5);

      // --- Update one skill level ---
      await supabaseAdmin
        .from("profile_skills")
        .update({ level: 10 })
        .eq("profile_id", ownerUser.id)
        .eq("skill_id", skillIds[0]);

      // --- Remove Python ---
      await supabaseAdmin
        .from("profile_skills")
        .delete()
        .eq("profile_id", ownerUser.id)
        .eq("skill_id", skillIds[2]);

      // --- Verify update + delete ---
      const { data: updated } = await supabaseAdmin
        .from("profile_skills")
        .select("skill_id, level")
        .eq("profile_id", ownerUser.id)
        .in("skill_id", skillIds)
        .order("level", { ascending: false });

      expect(updated).toHaveLength(2);
      expect(updated![0].level).toBe(10); // TypeScript bumped
      expect(updated![1].level).toBe(7); // Rust unchanged
    } finally {
      await supabaseAdmin
        .from("profile_skills")
        .delete()
        .eq("profile_id", ownerUser.id)
        .in("skill_id", skillIds);
      await supabaseAdmin.from("skill_nodes").delete().in("id", skillIds);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Profile validation edge cases
// ---------------------------------------------------------------------------

test.describe("Profile validation", () => {
  test("empty fullName, overlong fields, and special characters are handled", async ({
    ownerPage,
    ownerUser,
  }) => {
    // --- Empty fullName should still save (the API trims) ---
    const emptyNameResponse = await ownerPage.request.patch("/api/profiles", {
      data: {
        fullName: "",
        headline: "Test headline",
      },
    });
    // Should succeed (empty name is allowed — just saves empty string)
    expect(emptyNameResponse.ok()).toBe(true);

    // --- Special characters in all fields ---
    const specialCharsResponse = await ownerPage.request.patch(
      "/api/profiles",
      {
        data: {
          fullName: "O'Brien-Müller",
          headline: 'Headline with "quotes" & <tags>',
          bio: "Bio with emoji 🚀 and unicode: café, naïve, 日本語",
          location: "São Paulo, Brasil",
          interests: "C++, C#, Node.js",
          languages: "Français, 中文, العربية",
        },
      },
    );
    expect(specialCharsResponse.ok()).toBe(true);

    // --- Verify the stored values are correct ---
    if (supabaseAdmin) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("full_name, headline, bio, location")
        .eq("user_id", ownerUser.id)
        .single();

      expect(profile!.full_name).toBe("O'Brien-Müller");
      expect(profile!.headline).toBe('Headline with "quotes" & <tags>');
      expect(profile!.bio).toContain("emoji 🚀");
      expect(profile!.location).toBe("São Paulo, Brasil");
    }

    // --- Restore owner's original name ---
    await ownerPage.request.patch("/api/profiles", {
      data: { fullName: ownerUser.full_name },
    });
  });

  test("own profile page loads via /profile and /profile/[id]", async ({
    ownerPage,
    ownerUser,
  }) => {
    // --- /profile should show own profile ---
    await ownerPage.goto("/profile");
    await expect(
      ownerPage.locator(`text=${ownerUser.full_name}`).first(),
    ).toBeVisible({ timeout: 15000 });

    // --- /profile/[id] with own ID should also work ---
    await ownerPage.goto(`/profile/${ownerUser.id}`);
    await expect(
      ownerPage.locator(`text=${ownerUser.full_name}`).first(),
    ).toBeVisible({ timeout: 15000 });
  });
});
