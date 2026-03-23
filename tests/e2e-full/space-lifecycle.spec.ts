/**
 * Space Lifecycle E2E Tests
 *
 * Tests the core space flows end-to-end with two real users:
 *
 * 1. Space creation → messaging → cross-user message visibility
 * 2. Posting creation within a space → join request → owner review
 * 3. Space membership: adding a member, member list visibility
 *
 * Each test exercises a deep multi-step journey. Spaces are seeded via
 * supabaseAdmin (bypasses RLS, proven pattern from card-lifecycle tests).
 * API calls for messages/postings/membership go through the authenticated
 * user session to exercise real auth + RLS paths.
 *
 * Uses multi-context fixture: two independent browser sessions.
 */

import { test, expect, type Page } from "../../tests/fixtures/multi-context";
import { supabaseAdmin } from "../../tests/utils/supabase";

// Rate-limit absorption — each test creates 2 users via fixture
test.describe.configure({ mode: "serial", retries: 1 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a space via admin and add the owner as admin member. */
async function seedSpace(
  ownerId: string,
  name: string,
  stateText?: string | null,
): Promise<string> {
  if (!supabaseAdmin) throw new Error("Admin client required");

  const { data: space, error } = await supabaseAdmin
    .from("spaces")
    .insert({
      name,
      state_text: stateText ?? null,
      created_by: ownerId,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Space creation failed: ${error.message}`);

  const { error: memberError } = await supabaseAdmin
    .from("space_members")
    .insert({ space_id: space.id, user_id: ownerId, role: "admin" });
  if (memberError)
    throw new Error(`Member insert failed: ${memberError.message}`);

  return space.id;
}

/** Create a space via admin and add both users. */
async function seedSpaceWithMembers(
  ownerId: string,
  memberId: string,
  name: string,
): Promise<string> {
  const spaceId = await seedSpace(ownerId, name);

  const { error } = await supabaseAdmin!
    .from("space_members")
    .insert({ space_id: spaceId, user_id: memberId, role: "member" });
  if (error) throw new Error(`Member insert failed: ${error.message}`);

  return spaceId;
}

/** Send a message to a space via the authenticated API. */
async function sendMessageViaApi(
  page: Page,
  spaceId: string,
  content: string,
): Promise<void> {
  const response = await page.request.post(`/api/spaces/${spaceId}/messages`, {
    data: { content },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Send message failed (${response.status()}): ${body}`);
  }
}

/** Add a member to a space via the authenticated API (requires admin). */
async function addMemberViaApi(
  page: Page,
  spaceId: string,
  userId: string,
): Promise<void> {
  const response = await page.request.post(`/api/spaces/${spaceId}/members`, {
    data: { user_id: userId, role: "member" },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Add member failed (${response.status()}): ${body}`);
  }
}

/** Create a posting in a space via the authenticated API. */
async function createPostingViaApi(
  page: Page,
  spaceId: string,
  text: string,
  opts: {
    category?: string;
    capacity?: number;
    auto_accept?: boolean;
  } = {},
): Promise<string> {
  const response = await page.request.post(`/api/spaces/${spaceId}/postings`, {
    data: {
      text,
      category: opts.category ?? "personal",
      capacity: opts.capacity ?? 3,
      auto_accept: opts.auto_accept ?? false,
      visibility: "public",
    },
  });
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Create posting failed (${response.status()}): ${body}`);
  }
  const json = await response.json();
  const posting = json.data?.posting ?? json.posting;
  return posting.id;
}

/** Submit a join request for a posting via the authenticated API. */
async function joinPostingViaApi(
  page: Page,
  spaceId: string,
  postingId: string,
): Promise<{ status: string; id: string }> {
  const response = await page.request.post(
    `/api/spaces/${spaceId}/postings/${postingId}/join`,
    { data: {} },
  );
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Join posting failed (${response.status()}): ${body}`);
  }
  const json = await response.json();
  return json.data?.join_request ?? json.join_request;
}

/** Clean up a space (cascading deletes handle members, messages, postings). */
async function cleanupSpace(spaceId: string) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("spaces").delete().eq("id", spaceId);
}

// ---------------------------------------------------------------------------
// 1. Space creation → messaging → cross-user visibility
// ---------------------------------------------------------------------------

test.describe("Space creation and messaging", () => {
  let spaceId: string;

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("owner sends messages, member sees them, reply is visible to both", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    const spaceName = `E2E Msg Test ${Date.now()}`;

    // --- Step 1: Seed space with both users ---
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      spaceName,
    );

    // --- Step 2: Owner sends several messages via API ---
    await sendMessageViaApi(ownerPage, spaceId, "Hello from owner!");
    await sendMessageViaApi(ownerPage, spaceId, "This is message number two.");
    await sendMessageViaApi(
      ownerPage,
      spaceId,
      "Special chars: <script>alert('xss')</script> & 'quotes'",
    );

    // --- Step 3: Owner navigates to the space and sees messages in UI ---
    await ownerPage.goto(`/spaces/${spaceId}`);
    await ownerPage.waitForLoadState("networkidle").catch(() => {});

    await expect(ownerPage.locator("text=Hello from owner!")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      ownerPage.locator("text=This is message number two."),
    ).toBeVisible();

    // XSS content should be rendered as text, not executed
    await expect(
      ownerPage.locator("text=<script>alert('xss')</script>"),
    ).toBeVisible();

    // --- Step 4: Developer navigates to the same space ---
    await developerPage.goto(`/spaces/${spaceId}`);
    await developerPage.waitForLoadState("networkidle").catch(() => {});

    // Developer sees all owner's messages
    await expect(developerPage.locator("text=Hello from owner!")).toBeVisible({
      timeout: 15000,
    });
    await expect(
      developerPage.locator("text=This is message number two."),
    ).toBeVisible();

    // --- Step 5: Developer sends a reply via API ---
    await sendMessageViaApi(developerPage, spaceId, "Reply from developer");

    // Developer sees own message after reload
    await developerPage.reload();
    await expect(
      developerPage.locator("text=Reply from developer"),
    ).toBeVisible({ timeout: 15000 });

    // Owner reloads and sees the developer's reply
    await ownerPage.reload();
    await expect(ownerPage.locator("text=Reply from developer")).toBeVisible({
      timeout: 15000,
    });

    // --- Step 6: Verify message count and order via API ---
    const allMessages = await developerPage.request.get(
      `/api/spaces/${spaceId}/messages`,
    );
    expect(allMessages.ok()).toBe(true);
    const msgJson = await allMessages.json();
    const messages = msgJson.data?.messages ?? msgJson.messages ?? [];
    expect(messages.length).toBeGreaterThanOrEqual(4);
    // Newest first
    expect(messages[0].content).toBe("Reply from developer");

    // --- Step 7: Verify the space appears in both users' space lists ---
    const ownerSpaces = await ownerPage.request.get("/api/spaces");
    expect(ownerSpaces.ok()).toBe(true);
    const ownerJson = await ownerSpaces.json();
    const ownerSpacesList = ownerJson.data?.spaces ?? ownerJson.spaces ?? [];
    const ownerSpaceEntry = ownerSpacesList.find(
      (s: { id: string }) => s.id === spaceId,
    );
    expect(ownerSpaceEntry).toBeTruthy();
    expect(ownerSpaceEntry.name).toBe(spaceName);

    const devSpaces = await developerPage.request.get("/api/spaces");
    expect(devSpaces.ok()).toBe(true);
    const devJson = await devSpaces.json();
    const devSpacesList = devJson.data?.spaces ?? devJson.spaces ?? [];
    expect(devSpacesList.some((s: { id: string }) => s.id === spaceId)).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// 2. Space creation via UI
// ---------------------------------------------------------------------------

test.describe("Space creation dialog UI", () => {
  test("New Space dialog opens, validates empty name, and can be cancelled", async ({
    ownerPage,
  }) => {
    await ownerPage.goto("/spaces");
    await ownerPage.waitForLoadState("networkidle").catch(() => {});

    // --- Click "New Space" button ---
    const newSpaceButton = ownerPage.getByRole("button", {
      name: /New Space/i,
    });
    await expect(newSpaceButton).toBeVisible({ timeout: 10000 });
    await newSpaceButton.click();

    // --- Dialog should open with name and description inputs ---
    const nameInput = ownerPage.locator("#space-name");
    await expect(nameInput).toBeVisible({ timeout: 5000 });

    const descInput = ownerPage.locator("#space-description");
    await expect(descInput).toBeVisible();

    // --- Create button should be disabled when name is empty ---
    const createButton = ownerPage.getByRole("button", { name: "Create" });
    await expect(createButton).toBeDisabled();

    // --- Fill name → Create button becomes enabled ---
    await nameInput.fill("Test Space Name");
    await expect(createButton).toBeEnabled();

    // --- Clear name → Create button disabled again ---
    await nameInput.fill("");
    await expect(createButton).toBeDisabled();

    // --- Cancel closes the dialog ---
    const cancelButton = ownerPage.getByRole("button", { name: "Cancel" });
    await cancelButton.click();
    await expect(nameInput).not.toBeVisible({ timeout: 3000 });
  });
});

// ---------------------------------------------------------------------------
// 3. Posting lifecycle within a space
// ---------------------------------------------------------------------------

test.describe("Posting lifecycle in space", () => {
  let spaceId: string;

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("owner creates posting, developer joins, owner reviews — full lifecycle", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    const postingText =
      "Looking for a TypeScript dev to build a dashboard — must know React and Next.js";

    // --- Step 1: Seed space with both users ---
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      `E2E Posting Lifecycle ${Date.now()}`,
    );

    // --- Step 2: Owner creates a posting via API (manual review) ---
    const postingId = await createPostingViaApi(
      ownerPage,
      spaceId,
      postingText,
      {
        category: "personal",
        capacity: 3,
        auto_accept: false,
      },
    );

    // --- Step 3: Verify posting appears in space's postings list ---
    const postingsResponse = await ownerPage.request.get(
      `/api/spaces/${spaceId}/postings`,
    );
    const postingsData = await postingsResponse.json();
    const postingsList =
      postingsData.data?.postings ?? postingsData.postings ?? [];
    const posting = postingsList.find(
      (p: { id: string }) => p.id === postingId,
    );
    expect(posting).toBeTruthy();
    expect(posting.text).toContain("TypeScript dev");
    expect(posting.status).toBe("open");

    // --- Step 4: Developer submits a join request ---
    const joinResult = await joinPostingViaApi(
      developerPage,
      spaceId,
      postingId,
    );
    expect(joinResult.status).toBe("pending");

    // --- Step 5: Developer cannot join again (conflict) ---
    const duplicateResponse = await developerPage.request.post(
      `/api/spaces/${spaceId}/postings/${postingId}/join`,
      { data: {} },
    );
    expect(duplicateResponse.status()).toBe(409);

    // --- Step 6: Owner cannot join own posting ---
    const selfJoinResponse = await ownerPage.request.post(
      `/api/spaces/${spaceId}/postings/${postingId}/join`,
      { data: {} },
    );
    expect(selfJoinResponse.status()).toBe(400);

    // --- Step 7: Owner reviews the join request — accept ---
    const acceptResponse = await ownerPage.request.patch(
      `/api/spaces/${spaceId}/postings/${postingId}/join/${joinResult.id}`,
      { data: { status: "accepted" } },
    );
    expect(acceptResponse.ok()).toBe(true);
  });

  test("auto-accept posting — developer joins immediately without pending", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      `E2E Auto-Accept ${Date.now()}`,
    );

    const postingId = await createPostingViaApi(
      ownerPage,
      spaceId,
      "Open jam session — all welcome, auto-accept!",
      { auto_accept: true, capacity: 10 },
    );

    // Developer joins — should be immediately accepted
    const joinResult = await joinPostingViaApi(
      developerPage,
      spaceId,
      postingId,
    );
    expect(joinResult.status).toBe("accepted");
  });
});

// ---------------------------------------------------------------------------
// 4. Membership and access control
// ---------------------------------------------------------------------------

test.describe("Space membership and access control", () => {
  let spaceId: string;

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("non-member gets 403 on all space endpoints", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    // --- Seed space with owner only (developer NOT added) ---
    spaceId = await seedSpace(ownerUser.id, `E2E Access Control ${Date.now()}`);

    // --- Developer tries to access messages — should fail ---
    const msgResponse = await developerPage.request.get(
      `/api/spaces/${spaceId}/messages`,
    );
    expect(msgResponse.status()).toBe(403);

    // --- Developer tries to access postings — should fail ---
    const postResponse = await developerPage.request.get(
      `/api/spaces/${spaceId}/postings`,
    );
    expect(postResponse.status()).toBe(403);

    // --- Developer tries to send a message — should fail ---
    const sendResponse = await developerPage.request.post(
      `/api/spaces/${spaceId}/messages`,
      { data: { content: "Unauthorized message" } },
    );
    expect(sendResponse.status()).toBe(403);

    // --- Developer tries to create a posting — should fail ---
    const createResponse = await developerPage.request.post(
      `/api/spaces/${spaceId}/postings`,
      { data: { text: "Unauthorized posting" } },
    );
    expect(createResponse.status()).toBe(403);

    // --- Developer tries to list members — should fail ---
    const membersResponse = await developerPage.request.get(
      `/api/spaces/${spaceId}/members`,
    );
    expect(membersResponse.status()).toBe(403);

    // --- Developer tries to add themselves — should fail (not admin) ---
    const selfAdd = await developerPage.request.post(
      `/api/spaces/${spaceId}/members`,
      { data: { user_id: developerUser.id } },
    );
    expect(selfAdd.status()).toBe(403);
  });

  test("only admin can add members — member role is rejected", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      `E2E Admin Only ${Date.now()}`,
    );

    if (!supabaseAdmin) {
      test.skip(true, "Admin client required");
      return;
    }

    // Create a third user
    const thirdEmail = `e2e-third-${Date.now()}@test.local`;
    const { data: authData } = await supabaseAdmin.auth.admin.createUser({
      email: thirdEmail,
      password: "TestPassword123!",
      email_confirm: true,
      user_metadata: { full_name: "E2E Third User" },
    });

    try {
      const thirdUserId = authData.user!.id;
      await supabaseAdmin
        .from("profiles")
        .upsert(
          { user_id: thirdUserId, full_name: "E2E Third User" },
          { onConflict: "user_id" },
        );

      // Developer (member role) tries to add — should fail
      const devAdd = await developerPage.request.post(
        `/api/spaces/${spaceId}/members`,
        { data: { user_id: thirdUserId } },
      );
      expect(devAdd.status()).toBe(403);

      // Owner (admin) can add — should succeed
      const ownerAdd = await ownerPage.request.post(
        `/api/spaces/${spaceId}/members`,
        { data: { user_id: thirdUserId } },
      );
      expect(ownerAdd.ok()).toBe(true);

      // Duplicate add — should 409
      const dup = await ownerPage.request.post(
        `/api/spaces/${spaceId}/members`,
        { data: { user_id: thirdUserId } },
      );
      expect(dup.status()).toBe(409);
    } finally {
      if (authData.user) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Message validation edge cases
// ---------------------------------------------------------------------------

test.describe("Message validation", () => {
  let spaceId: string;

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("empty and overlong messages are rejected, valid messages succeed", async ({
    ownerPage,
    ownerUser,
    developerUser,
  }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      `E2E Msg Validation ${Date.now()}`,
    );

    // Empty message — rejected
    const emptyResponse = await ownerPage.request.post(
      `/api/spaces/${spaceId}/messages`,
      { data: { content: "" } },
    );
    expect(emptyResponse.status()).toBe(400);

    // Whitespace-only — rejected
    const wsResponse = await ownerPage.request.post(
      `/api/spaces/${spaceId}/messages`,
      { data: { content: "   \n\t  " } },
    );
    expect(wsResponse.status()).toBe(400);

    // Overlong (>10000 chars) — rejected
    const overlongResponse = await ownerPage.request.post(
      `/api/spaces/${spaceId}/messages`,
      { data: { content: "x".repeat(10001) } },
    );
    expect(overlongResponse.status()).toBe(400);

    // Exactly 10000 chars — accepted
    const maxContent = "y".repeat(10000);
    const maxResponse = await ownerPage.request.post(
      `/api/spaces/${spaceId}/messages`,
      { data: { content: maxContent } },
    );
    expect(maxResponse.ok()).toBe(true);

    // Normal message — accepted
    const normalResponse = await ownerPage.request.post(
      `/api/spaces/${spaceId}/messages`,
      { data: { content: "Normal message" } },
    );
    expect(normalResponse.ok()).toBe(true);

    // Verify order (newest first)
    const allMessages = await ownerPage.request.get(
      `/api/spaces/${spaceId}/messages`,
    );
    const msgJson = await allMessages.json();
    const msgs = msgJson.data?.messages ?? msgJson.messages ?? [];
    expect(msgs[0].content).toBe("Normal message");
    expect(msgs[1].content).toBe(maxContent);
  });
});
