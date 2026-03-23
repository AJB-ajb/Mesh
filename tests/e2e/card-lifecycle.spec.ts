/**
 * Card Lifecycle E2E Tests
 *
 * Tests the core card flows end-to-end with two real users in a shared space.
 * Includes both happy-path tests and adversarial edge cases that probe for
 * real bugs: malformed data, deadline auto-resolve, vote toggle withdrawal,
 * missing validation on the card creation endpoint, and privacy boundaries.
 *
 * Uses multi-context fixture (two independent browser sessions).
 * Spaces and cards are seeded via Supabase admin client for speed/reliability.
 */

import { test, expect, type Page } from "../fixtures/multi-context";
import { supabaseAdmin } from "../utils/supabase";

// Each test creates 2 Supabase users via the multi-context fixture.
// With 28 tests that's 56 user creations — Supabase auth rate-limits this,
// so we add 1 retry to absorb transient login timeouts.
test.describe.configure({ mode: "parallel", retries: 1 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a space via admin and add both users as members. */
async function seedSpaceWithMembers(
  ownerUserId: string,
  developerUserId: string,
  spaceName: string,
): Promise<string> {
  if (!supabaseAdmin) throw new Error("Admin client required");

  const { data: space, error } = await supabaseAdmin
    .from("spaces")
    .insert({ name: spaceName, created_by: ownerUserId })
    .select("id")
    .single();

  if (error) throw new Error(`Space creation failed: ${error.message}`);

  const { error: memberError } = await supabaseAdmin
    .from("space_members")
    .insert([
      { space_id: space.id, user_id: ownerUserId, role: "admin" },
      { space_id: space.id, user_id: developerUserId, role: "member" },
    ]);

  if (memberError)
    throw new Error(`Member insert failed: ${memberError.message}`);

  return space.id;
}

/** Create a card via admin insert (bypasses API auth, fast for seeding). */
async function seedCard(
  spaceId: string,
  creatorId: string,
  type: string,
  data: Record<string, unknown>,
  deadline?: string | null,
): Promise<string> {
  if (!supabaseAdmin) throw new Error("Admin client required");

  const { data: card, error } = await supabaseAdmin
    .from("space_cards")
    .insert({
      space_id: spaceId,
      created_by: creatorId,
      type,
      data,
      deadline: deadline ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Card creation failed: ${error.message}`);

  // Also create a message so the card appears in timeline
  const { data: message, error: msgErr } = await supabaseAdmin
    .from("space_messages")
    .insert({
      space_id: spaceId,
      sender_id: creatorId,
      type: "card",
      card_id: card.id,
      content: `Card: ${type}`,
    })
    .select("id")
    .single();

  if (msgErr) throw new Error(`Message creation failed: ${msgErr.message}`);

  await supabaseAdmin
    .from("space_cards")
    .update({ message_id: message.id })
    .eq("id", card.id);

  return card.id;
}

/** Clean up space (cascading deletes handle members, messages, cards). */
async function cleanupSpace(spaceId: string) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("spaces").delete().eq("id", spaceId);
}

/** Navigate to a space and wait for it to load. */
async function goToSpace(page: Page, spaceId: string) {
  await page.goto(`/spaces/${spaceId}`, { waitUntil: "domcontentloaded" });
  // Wait for the page to stabilize — the space view may use various
  // data-testid values or none at all, so we wait for network idle
  // rather than a specific selector.
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {
    // Tolerate timeout — page may have long-polling realtime connections
  });
}

/** Vote on a card option via the API (faster than UI clicks for seeding). */
async function voteViaApi(
  page: Page,
  spaceId: string,
  cardId: string,
  optionIndex: number,
): Promise<{ data: unknown; follow_up_suggestion: unknown }> {
  const response = await page.request.post(
    `/api/spaces/${spaceId}/cards/${cardId}/vote`,
    { data: { option_index: optionIndex } },
  );
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Vote failed (${response.status()}): ${body}`);
  }
  return response.json();
}

/** Fetch cards for a space via API. */
async function fetchCards(
  page: Page,
  spaceId: string,
): Promise<{ cards: Array<Record<string, unknown>> }> {
  const response = await page.request.get(`/api/spaces/${spaceId}/cards`);
  if (!response.ok()) {
    throw new Error(`Fetch cards failed: ${response.status()}`);
  }
  return response.json();
}

/** Create a card via the authenticated API (goes through validation). */
async function createCardViaApi(
  page: Page,
  spaceId: string,
  type: string,
  data: Record<string, unknown>,
  deadline?: string | null,
) {
  return page.request.post(`/api/spaces/${spaceId}/cards`, {
    data: { type, data, ...(deadline !== undefined ? { deadline } : {}) },
  });
}

// ---------------------------------------------------------------------------
// 1. Poll Card — Create, Vote, Cross-User Visibility
// ---------------------------------------------------------------------------

test.describe("Poll card lifecycle", () => {
  let spaceId: string;
  let cardId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Poll Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("both users can vote and see each other's votes", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    // Seed a poll card
    cardId = await seedCard(spaceId, ownerUser.id, "poll", {
      question: "Best programming language?",
      options: [
        { label: "TypeScript", votes: [] },
        { label: "Rust", votes: [] },
        { label: "Go", votes: [] },
      ],
    });

    // Owner votes for TypeScript (option 0)
    await voteViaApi(ownerPage, spaceId, cardId, 0);

    // Developer votes for Rust (option 1)
    await voteViaApi(developerPage, spaceId, cardId, 1);

    // Verify both votes are reflected when owner fetches cards
    const ownerResult = await fetchCards(ownerPage, spaceId);
    const pollCard = ownerResult.cards.find((c) => c.id === cardId);
    expect(pollCard).toBeTruthy();

    const data = pollCard!.data as {
      question: string;
      options: Array<{ label: string; votes: string[] }>;
    };
    expect(data.question).toBe("Best programming language?");

    // TypeScript should have owner's vote
    const tsOption = data.options.find((o) => o.label === "TypeScript");
    expect(tsOption?.votes).toContain(ownerUser.id);
    expect(tsOption?.votes).toHaveLength(1);

    // Rust should have developer's vote
    const rustOption = data.options.find((o) => o.label === "Rust");
    expect(rustOption?.votes).toContain(developerUser.id);
    expect(rustOption?.votes).toHaveLength(1);

    // Go should have no votes
    const goOption = data.options.find((o) => o.label === "Go");
    expect(goOption?.votes).toHaveLength(0);

    // Card should still be active (polls don't auto-resolve)
    expect(pollCard!.status).toBe("active");
  });

  test("voting is single-select — changing vote removes from previous option", async ({
    ownerPage,
    ownerUser,
  }) => {
    cardId = await seedCard(spaceId, ownerUser.id, "poll", {
      question: "Lunch spot?",
      options: [
        { label: "Pizza", votes: [] },
        { label: "Sushi", votes: [] },
      ],
    });

    // Vote for Pizza first
    await voteViaApi(ownerPage, spaceId, cardId, 0);

    // Change vote to Sushi
    await voteViaApi(ownerPage, spaceId, cardId, 1);

    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);
    const data = card!.data as {
      options: Array<{ label: string; votes: string[] }>;
    };

    // Pizza should have 0 votes (removed), Sushi should have 1
    expect(data.options[0].votes).toHaveLength(0);
    expect(data.options[1].votes).toContain(ownerUser.id);
  });
});

// ---------------------------------------------------------------------------
// 2. Time Proposal — Multi-Select Voting + Auto-Resolve
// ---------------------------------------------------------------------------

test.describe("Time proposal auto-resolve", () => {
  let spaceId: string;
  let cardId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Time Proposal Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("auto-resolves when all members vote and there is a clear winner", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    cardId = await seedCard(spaceId, ownerUser.id, "time_proposal", {
      title: "Coffee chat",
      options: [
        { label: "Monday 10am", votes: [] },
        { label: "Tuesday 2pm", votes: [] },
        { label: "Wednesday 4pm", votes: [] },
      ],
      duration_minutes: 30,
    });

    // Time proposals are multi-select, so users vote on individual slots

    // Owner votes for Monday and Tuesday
    await voteViaApi(ownerPage, spaceId, cardId, 0); // Monday
    await voteViaApi(ownerPage, spaceId, cardId, 1); // Tuesday

    // Card should still be active (not all members voted yet)
    let result = await fetchCards(ownerPage, spaceId);
    let card = result.cards.find((c) => c.id === cardId);
    expect(card!.status).toBe("active");

    // Developer votes for Tuesday only — this makes Tuesday the clear winner
    // and all members have now voted
    await voteViaApi(developerPage, spaceId, cardId, 1); // Tuesday

    // Card should now be auto-resolved with Tuesday as winner
    result = await fetchCards(ownerPage, spaceId);
    card = result.cards.find((c) => c.id === cardId);
    expect(card!.status).toBe("resolved");

    const data = card!.data as { resolved_slot: string };
    expect(data.resolved_slot).toBe("Tuesday 2pm");
  });

  test("does NOT auto-resolve on a tie", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    cardId = await seedCard(spaceId, ownerUser.id, "time_proposal", {
      title: "Team sync",
      options: [
        { label: "Monday 10am", votes: [] },
        { label: "Friday 3pm", votes: [] },
      ],
    });

    // Owner votes Monday, Developer votes Friday → tie
    await voteViaApi(ownerPage, spaceId, cardId, 0);
    await voteViaApi(developerPage, spaceId, cardId, 1);

    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);

    // Should remain active due to tie
    expect(card!.status).toBe("active");
  });

  test("multi-select: user can vote on multiple slots independently", async ({
    ownerPage,
    ownerUser,
  }) => {
    cardId = await seedCard(spaceId, ownerUser.id, "time_proposal", {
      title: "Workshop",
      options: [
        { label: "Slot A", votes: [] },
        { label: "Slot B", votes: [] },
        { label: "Slot C", votes: [] },
      ],
    });

    // Vote on A, B, and C
    await voteViaApi(ownerPage, spaceId, cardId, 0);
    await voteViaApi(ownerPage, spaceId, cardId, 1);
    await voteViaApi(ownerPage, spaceId, cardId, 2);

    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);
    const data = card!.data as {
      options: Array<{ label: string; votes: string[] }>;
    };

    // All three should have the owner's vote
    expect(data.options[0].votes).toContain(ownerUser.id);
    expect(data.options[1].votes).toContain(ownerUser.id);
    expect(data.options[2].votes).toContain(ownerUser.id);
  });
});

// ---------------------------------------------------------------------------
// 3. Member Notes Privacy
// ---------------------------------------------------------------------------

test.describe("Member notes privacy", () => {
  let spaceId: string;
  let cardId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Notes Privacy Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("each user only sees their own member note", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    // Seed card with per-user private notes
    cardId = await seedCard(spaceId, ownerUser.id, "time_proposal", {
      title: "Lunch meeting",
      options: [
        { label: "12pm", votes: [] },
        { label: "1pm", votes: [] },
      ],
      member_notes: {
        [ownerUser.id]:
          "You have a meeting until 11:30, 30 min buffer → ready by 12:00",
        [developerUser.id]: "Your calendar is free all afternoon ✓",
      },
    });

    // Owner fetches cards — should only see their own note
    const ownerResult = await fetchCards(ownerPage, spaceId);
    const ownerCard = ownerResult.cards.find((c) => c.id === cardId);
    const ownerData = ownerCard!.data as {
      member_notes: Record<string, string> | null;
    };

    expect(ownerData.member_notes).toBeTruthy();
    expect(ownerData.member_notes![ownerUser.id]).toContain(
      "meeting until 11:30",
    );
    // Must NOT contain developer's note
    expect(ownerData.member_notes![developerUser.id]).toBeUndefined();

    // Developer fetches cards — should only see their own note
    const devResult = await fetchCards(developerPage, spaceId);
    const devCard = devResult.cards.find((c) => c.id === cardId);
    const devData = devCard!.data as {
      member_notes: Record<string, string> | null;
    };

    expect(devData.member_notes).toBeTruthy();
    expect(devData.member_notes![developerUser.id]).toContain(
      "free all afternoon",
    );
    // Must NOT contain owner's note
    expect(devData.member_notes![ownerUser.id]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Task Claim — Auto-Resolve on First Claim
// ---------------------------------------------------------------------------

test.describe("Task claim auto-resolve", () => {
  let spaceId: string;
  let cardId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Task Claim Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("auto-resolves when someone claims the task", async ({
    developerPage,
    developerUser,
    ownerUser,
    ownerPage,
  }) => {
    cardId = await seedCard(spaceId, ownerUser.id, "task_claim", {
      description: "Pick up the meeting room keys",
      options: [{ label: "Claim", votes: [] }],
    });

    // Developer claims the task
    await voteViaApi(developerPage, spaceId, cardId, 0);

    // Card should auto-resolve with claimed_by set to developer
    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);

    expect(card!.status).toBe("resolved");
    const data = card!.data as { claimed_by: string };
    expect(data.claimed_by).toBe(developerUser.id);
  });
});

// ---------------------------------------------------------------------------
// 5. RSVP — Threshold-Based Auto-Resolve
// ---------------------------------------------------------------------------

test.describe("RSVP auto-resolve", () => {
  let spaceId: string;
  let cardId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E RSVP Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("auto-resolves when Yes votes reach threshold", async ({
    ownerPage,
    ownerUser,
    developerPage,
  }) => {
    // Threshold of 2 — both must say Yes
    cardId = await seedCard(spaceId, ownerUser.id, "rsvp", {
      title: "Team dinner Friday",
      options: [
        { label: "Yes", votes: [] },
        { label: "No", votes: [] },
        { label: "Maybe", votes: [] },
      ],
      threshold: 2,
    });

    // Owner says Yes — threshold not met yet
    await voteViaApi(ownerPage, spaceId, cardId, 0);
    let result = await fetchCards(ownerPage, spaceId);
    let card = result.cards.find((c) => c.id === cardId);
    expect(card!.status).toBe("active");

    // Developer says Yes — threshold met
    await voteViaApi(developerPage, spaceId, cardId, 0);
    result = await fetchCards(ownerPage, spaceId);
    card = result.cards.find((c) => c.id === cardId);
    expect(card!.status).toBe("resolved");
  });

  test("does NOT auto-resolve if Yes votes below threshold", async ({
    ownerPage,
    ownerUser,
    developerPage,
  }) => {
    cardId = await seedCard(spaceId, ownerUser.id, "rsvp", {
      title: "Offsite trip",
      options: [
        { label: "Yes", votes: [] },
        { label: "No", votes: [] },
      ],
      threshold: 2,
    });

    // Owner says Yes, Developer says No
    await voteViaApi(ownerPage, spaceId, cardId, 0);
    await voteViaApi(developerPage, spaceId, cardId, 1);

    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);
    expect(card!.status).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// 6. Vote Guards — Cannot Vote on Inactive Card
// ---------------------------------------------------------------------------

test.describe("Vote guards", () => {
  let spaceId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Vote Guards Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("voting on a resolved card fails", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    // Create a task_claim card that auto-resolves when claimed
    const cardId = await seedCard(spaceId, ownerUser.id, "task_claim", {
      description: "Bring snacks",
      options: [{ label: "Claim", votes: [] }],
    });

    // Owner claims → card auto-resolves
    await voteViaApi(ownerPage, spaceId, cardId, 0);

    // Verify resolved
    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);
    expect(card!.status).toBe("resolved");

    // Developer tries to vote on the resolved card — should fail
    const response = await developerPage.request.post(
      `/api/spaces/${spaceId}/cards/${cardId}/vote`,
      { data: { option_index: 0 } },
    );

    // The RPC raises 'Card is not active' — API should return an error status
    expect(response.ok()).toBe(false);

    // Double-check: votes didn't change
    const afterResult = await fetchCards(ownerPage, spaceId);
    const afterCard = afterResult.cards.find((c) => c.id === cardId);
    const afterData = afterCard!.data as {
      options: Array<{ votes: string[] }>;
    };

    // Developer's ID should NOT appear in votes — only the owner's claim
    expect(afterData.options[0].votes).not.toContain(developerUser.id);
    expect(afterData.options[0].votes).toHaveLength(1);
  });

  test("non-member cannot vote on a space card", async ({
    ownerPage,
    ownerUser,
  }) => {
    const cardId = await seedCard(spaceId, ownerUser.id, "poll", {
      question: "Members only?",
      options: [{ label: "Yes", votes: [] }],
    });

    // Create a third user who is NOT a member of the space
    if (!supabaseAdmin) throw new Error("Admin client required");

    const outsiderEmail = `outsider-${Date.now()}@e2e-test.local`;
    const { data: outsider, error: createErr } =
      await supabaseAdmin.auth.admin.createUser({
        email: outsiderEmail,
        password: "TestPassword123!",
        email_confirm: true,
        user_metadata: { full_name: "Outsider" },
      });

    if (createErr)
      throw new Error(`Failed to create outsider: ${createErr.message}`);

    // Ensure profile exists
    await supabaseAdmin
      .from("profiles")
      .upsert(
        { user_id: outsider!.user.id, full_name: "Outsider" },
        { onConflict: "user_id" },
      );

    try {
      // Create a new browser context and log in as the outsider
      const outsiderContext = await ownerPage.context().browser()!.newContext();
      const outsiderPage = await outsiderContext.newPage();

      await outsiderPage.goto("/login");
      await outsiderPage.fill('input[type="email"]', outsiderEmail);
      await outsiderPage.fill('input[type="password"]', "TestPassword123!");
      await outsiderPage.click('button[type="submit"]');
      await outsiderPage.waitForURL("**/spaces", {
        timeout: 10000,
        waitUntil: "domcontentloaded",
      });

      // Try to vote — should be rejected (not a member of this space)
      const response = await outsiderPage.request.post(
        `/api/spaces/${spaceId}/cards/${cardId}/vote`,
        { data: { option_index: 0 } },
      );

      expect(response.status()).toBeGreaterThanOrEqual(400);

      await outsiderContext.close();
    } finally {
      await supabaseAdmin.auth.admin.deleteUser(outsider!.user.id);
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Card Renders in Space UI
// ---------------------------------------------------------------------------

test.describe("Card UI rendering", () => {
  let spaceId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Card Render Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("poll card renders with question and options in the space", async ({
    ownerPage,
    ownerUser,
  }) => {
    await seedCard(spaceId, ownerUser.id, "poll", {
      question: "Where for lunch?",
      options: [
        { label: "Burger place", votes: [] },
        { label: "Sushi bar", votes: [] },
      ],
    });

    await goToSpace(ownerPage, spaceId);

    // Poll question should be visible
    await expect(
      ownerPage.locator("text=Where for lunch?").first(),
    ).toBeVisible({ timeout: 10000 });

    // Options should be visible
    await expect(ownerPage.locator("text=Burger place").first()).toBeVisible({
      timeout: 5000,
    });
    await expect(ownerPage.locator("text=Sushi bar").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("time proposal card renders with title and slot options", async ({
    ownerPage,
    ownerUser,
  }) => {
    await seedCard(spaceId, ownerUser.id, "time_proposal", {
      title: "Planning meeting",
      options: [
        { label: "Mon 9am", votes: [] },
        { label: "Tue 2pm", votes: [] },
      ],
    });

    await goToSpace(ownerPage, spaceId);

    await expect(
      ownerPage.locator("text=Planning meeting").first(),
    ).toBeVisible({ timeout: 10000 });

    await expect(ownerPage.locator("text=Mon 9am").first()).toBeVisible({
      timeout: 5000,
    });
  });

  test("resolved card shows resolved status", async ({
    ownerPage,
    ownerUser,
    developerPage,
  }) => {
    const cardId = await seedCard(spaceId, ownerUser.id, "task_claim", {
      description: "Grab the projector",
      options: [{ label: "Claim", votes: [] }],
    });

    // Resolve it by claiming
    await voteViaApi(ownerPage, spaceId, cardId, 0);

    await goToSpace(ownerPage, spaceId);

    // The task description should be visible
    await expect(
      ownerPage.locator("text=Grab the projector").first(),
    ).toBeVisible({ timeout: 10000 });

    // Should show resolved state (look for "Resolved" or "Claimed" text)
    await expect(
      ownerPage.locator("text=/resolved|claimed/i").first(),
    ).toBeVisible({ timeout: 5000 });
  });
});

// ===========================================================================
// ADVERSARIAL / EDGE-CASE TESTS
// ===========================================================================

// ---------------------------------------------------------------------------
// 8. Deadline Auto-Resolve via GET
// ---------------------------------------------------------------------------

test.describe("Deadline auto-resolve on read", () => {
  let spaceId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Deadline Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("expired card with votes auto-resolves on GET", async ({
    ownerPage,
    ownerUser,
    developerUser,
  }) => {
    // Seed a time proposal with a deadline in the past
    const pastDeadline = new Date(Date.now() - 60_000).toISOString();

    // Pre-populate votes so auto-resolve has data to work with
    // Both members voted, Tuesday has 2 votes (clear winner)
    const cardId = await seedCard(
      spaceId,
      ownerUser.id,
      "time_proposal",
      {
        title: "Expired meeting",
        options: [
          { label: "Monday", votes: [ownerUser.id] },
          { label: "Tuesday", votes: [ownerUser.id, developerUser.id] },
        ],
      },
      pastDeadline,
    );

    // Just fetching cards should trigger auto-resolve
    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);

    expect(card!.status).toBe("resolved");
    const data = card!.data as { resolved_slot: string };
    expect(data.resolved_slot).toBe("Tuesday");
  });

  test("expired card with zero votes resolves without crashing", async ({
    ownerPage,
    ownerUser,
  }) => {
    // Deadline in the past, no votes at all
    const pastDeadline = new Date(Date.now() - 60_000).toISOString();

    const cardId = await seedCard(
      spaceId,
      ownerUser.id,
      "time_proposal",
      {
        title: "Nobody voted",
        options: [
          { label: "Monday", votes: [] },
          { label: "Tuesday", votes: [] },
        ],
      },
      pastDeadline,
    );

    // GET should not crash — card should be resolved (deadline forced)
    // but resolved_slot may be absent since there's no winner
    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);

    // The card should be marked resolved (deadline passed)
    expect(card!.status).toBe("resolved");
  });

  test("expired card with a tie resolves without crashing", async ({
    ownerPage,
    ownerUser,
    developerUser,
  }) => {
    const pastDeadline = new Date(Date.now() - 60_000).toISOString();

    const cardId = await seedCard(
      spaceId,
      ownerUser.id,
      "time_proposal",
      {
        title: "Tied vote expired",
        options: [
          { label: "Monday", votes: [ownerUser.id] },
          { label: "Tuesday", votes: [developerUser.id] },
        ],
      },
      pastDeadline,
    );

    // GET should resolve (deadline passed) even though there's a tie
    // checkAutoResolve returns shouldResolve:false for ties, but the
    // GET handler resolves all expired cards regardless
    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);

    // Card should be resolved (forced by deadline)
    expect(card!.status).toBe("resolved");
    // No resolved_slot since there's no clear winner
    const data = card!.data as { resolved_slot?: string };
    // resolved_slot should be absent or null (tie — no winner picked)
    expect(data.resolved_slot).toBeFalsy();
  });

  test("non-expired card stays active on GET", async ({
    ownerPage,
    ownerUser,
  }) => {
    // Deadline in the future
    const futureDeadline = new Date(Date.now() + 3_600_000).toISOString();

    const cardId = await seedCard(
      spaceId,
      ownerUser.id,
      "poll",
      {
        question: "Still open?",
        options: [{ label: "Yes", votes: [] }],
      },
      futureDeadline,
    );

    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);
    expect(card!.status).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// 9. Vote Toggle / Withdrawal Edge Cases
// ---------------------------------------------------------------------------

test.describe("Vote withdrawal edge cases", () => {
  let spaceId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Vote Withdrawal Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("time proposal: toggling vote off withdraws from that slot", async ({
    ownerPage,
    ownerUser,
  }) => {
    const cardId = await seedCard(spaceId, ownerUser.id, "time_proposal", {
      title: "Toggle test",
      options: [
        { label: "Slot A", votes: [] },
        { label: "Slot B", votes: [] },
      ],
    });

    // Vote on Slot A
    await voteViaApi(ownerPage, spaceId, cardId, 0);
    // Toggle Slot A off (vote again on same option)
    await voteViaApi(ownerPage, spaceId, cardId, 0);

    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);
    const data = card!.data as {
      options: Array<{ votes: string[] }>;
    };

    // Slot A should have 0 votes after toggle-off
    expect(data.options[0].votes).toHaveLength(0);
    expect(data.options[0].votes).not.toContain(ownerUser.id);
  });

  test("poll: voting same option again toggles it off (unvote)", async ({
    ownerPage,
    ownerUser,
  }) => {
    const cardId = await seedCard(spaceId, ownerUser.id, "poll", {
      question: "Unvote test",
      options: [
        { label: "A", votes: [] },
        { label: "B", votes: [] },
      ],
    });

    // Vote for A
    await voteViaApi(ownerPage, spaceId, cardId, 0);
    // Click A again — should unvote
    await voteViaApi(ownerPage, spaceId, cardId, 0);

    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);
    const data = card!.data as {
      options: Array<{ votes: string[] }>;
    };

    // Both options should have 0 votes
    expect(data.options[0].votes).toHaveLength(0);
    expect(data.options[1].votes).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 10. Card Creation Validation (probing for missing guards)
// ---------------------------------------------------------------------------

test.describe("Card creation validation", () => {
  let spaceId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Card Validation Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("creating a poll with 0 options is accepted (missing validation)", async ({
    ownerPage,
  }) => {
    // BUG PROBE: POST handler doesn't validate data shape.
    // A poll with 0 options should arguably be rejected, but currently isn't.
    // This test documents the current behavior and will break if validation is added
    // (update the assertion to expect rejection when that happens).
    const response = await createCardViaApi(ownerPage, spaceId, "poll", {
      question: "No options poll",
      options: [],
    });

    // Currently succeeds — no data shape validation on the POST handler
    expect(response.ok()).toBe(true);

    // The empty-options card is fetchable without crashing the GET handler
    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find(
      (c) => (c.data as { question: string })?.question === "No options poll",
    );
    expect(card).toBeTruthy();
    expect(card!.status).toBe("active");
  });

  test("creating a card with missing type field is rejected", async ({
    ownerPage,
  }) => {
    const response = await ownerPage.request.post(
      `/api/spaces/${spaceId}/cards`,
      { data: { data: { question: "Missing type" } } },
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("creating a card with missing data field is rejected", async ({
    ownerPage,
  }) => {
    const response = await ownerPage.request.post(
      `/api/spaces/${spaceId}/cards`,
      { data: { type: "poll" } },
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test("card creation via API creates both card and message", async ({
    ownerPage,
  }) => {
    const response = await createCardViaApi(ownerPage, spaceId, "poll", {
      question: "API creation test",
      options: [
        { label: "Yes", votes: [] },
        { label: "No", votes: [] },
      ],
    });

    expect(response.ok()).toBe(true);
    const body = await response.json();

    // Card should have a message_id back-link
    expect(body.card).toBeTruthy();
    expect(body.card.message_id).toBeTruthy();
    expect(body.card.type).toBe("poll");
    expect(body.card.status).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// 11. Concurrent Voting — Both Users Vote Simultaneously
// ---------------------------------------------------------------------------

test.describe("Concurrent voting", () => {
  let spaceId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Concurrent Vote Test",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("simultaneous votes from both users are both recorded", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    const cardId = await seedCard(spaceId, ownerUser.id, "poll", {
      question: "Race condition test",
      options: [
        { label: "A", votes: [] },
        { label: "B", votes: [] },
      ],
    });

    // Fire both votes concurrently
    const [ownerResult, devResult] = await Promise.all([
      ownerPage.request.post(`/api/spaces/${spaceId}/cards/${cardId}/vote`, {
        data: { option_index: 0 },
      }),
      developerPage.request.post(
        `/api/spaces/${spaceId}/cards/${cardId}/vote`,
        { data: { option_index: 1 } },
      ),
    ]);

    expect(ownerResult.ok()).toBe(true);
    expect(devResult.ok()).toBe(true);

    // Verify both votes are recorded (no lost updates)
    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);
    const data = card!.data as {
      options: Array<{ votes: string[] }>;
    };

    // Each option should have exactly 1 vote
    const totalVotes = data.options.reduce((sum, o) => sum + o.votes.length, 0);
    expect(totalVotes).toBe(2);

    // Both user IDs should appear somewhere in the votes
    const allVoters = data.options.flatMap((o) => o.votes);
    expect(allVoters).toContain(ownerUser.id);
    expect(allVoters).toContain(developerUser.id);
  });

  test("simultaneous votes on time_proposal trigger auto-resolve correctly", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    const cardId = await seedCard(spaceId, ownerUser.id, "time_proposal", {
      title: "Concurrent resolve test",
      options: [
        { label: "Slot A", votes: [] },
        { label: "Slot B", votes: [] },
      ],
    });

    // Both vote for Slot A concurrently — should trigger auto-resolve
    const [r1, r2] = await Promise.all([
      ownerPage.request.post(`/api/spaces/${spaceId}/cards/${cardId}/vote`, {
        data: { option_index: 0 },
      }),
      developerPage.request.post(
        `/api/spaces/${spaceId}/cards/${cardId}/vote`,
        { data: { option_index: 0 } },
      ),
    ]);

    expect(r1.ok()).toBe(true);
    expect(r2.ok()).toBe(true);

    // Card should be resolved with Slot A as winner
    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);

    expect(card!.status).toBe("resolved");
    const data = card!.data as { resolved_slot: string };
    expect(data.resolved_slot).toBe("Slot A");
  });
});

// ---------------------------------------------------------------------------
// 12. Member Notes — Edge Cases
// ---------------------------------------------------------------------------

test.describe("Member notes edge cases", () => {
  let spaceId: string;

  test.beforeEach(async ({ ownerUser, developerUser }) => {
    spaceId = await seedSpaceWithMembers(
      ownerUser.id,
      developerUser.id,
      "E2E Notes Edge Cases",
    );
  });

  test.afterEach(async () => {
    if (spaceId) await cleanupSpace(spaceId);
  });

  test("card with no member_notes returns null, not empty object", async ({
    ownerPage,
    ownerUser,
  }) => {
    const cardId = await seedCard(spaceId, ownerUser.id, "time_proposal", {
      title: "No notes card",
      options: [{ label: "Slot", votes: [] }],
      // No member_notes field at all
    });

    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);
    const data = card!.data as { member_notes?: unknown };

    // Should be absent or null — not an empty object that might confuse the UI
    expect(data.member_notes == null).toBe(true);
  });

  test("member notes with unknown user IDs are stripped cleanly", async ({
    ownerPage,
    ownerUser,
  }) => {
    // Seed a card where member_notes contains a user ID that doesn't
    // belong to the requesting user — e.g. a deleted user
    const fakeUserId = "00000000-0000-0000-0000-000000000099";
    const cardId = await seedCard(spaceId, ownerUser.id, "time_proposal", {
      title: "Stale notes card",
      options: [{ label: "Slot", votes: [] }],
      member_notes: {
        [fakeUserId]: "This is a note for a user who doesn't exist",
      },
    });

    const result = await fetchCards(ownerPage, spaceId);
    const card = result.cards.find((c) => c.id === cardId);
    const data = card!.data as { member_notes: Record<string, string> | null };

    // Owner should get null (their ID isn't in member_notes)
    expect(data.member_notes).toBeNull();
  });
});
