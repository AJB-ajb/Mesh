/**
 * Full Posting Lifecycle E2E Tests
 *
 * Multi-user tests exercising the complete posting lifecycle:
 * owner creates/seeds posting → developer applies → owner reviews → outcome.
 *
 * Uses multi-context fixture for two simultaneous browser sessions.
 */

import { test, expect, type Page } from "../fixtures/multi-context";
import { seedPostingDirect } from "../utils/seed-helpers";

/** Returns an ISO date string 30 days from now. */
function expiresIn30Days(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

/**
 * Complete the SmartAcceptanceCard flow on a page.
 * Waits for the card to load (either with time slots or as a simple confirm),
 * selects a time slot if required, then clicks "Confirm & Join".
 */
async function completeAcceptanceCard(page: Page) {
  // Wait for the card to finish loading — either time slots or "Confirm & Join" appear
  const confirmButton = page.getByRole("button", { name: "Confirm & Join" });
  await expect(confirmButton).toBeVisible({ timeout: 30000 });

  // If the card has time slots, select the first one to enable the button
  const timeSlotButtons = page.locator("button[aria-pressed]");
  const slotCount = await timeSlotButtons.count();
  if (slotCount > 0) {
    await timeSlotButtons.first().click();
  }

  // Now click "Confirm & Join" (should be enabled)
  await expect(confirmButton).toBeEnabled({ timeout: 5000 });
  await confirmButton.click();
}

test.describe("Posting Lifecycle", () => {
  test("manual review — full lifecycle from creation to acceptance", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    const uniqueId = Date.now();
    const description = `E2E Lifecycle ${uniqueId} — Looking for a React developer to build a dashboard.`;

    // --- Owner creates posting via UI ---
    await ownerPage.goto("/postings/new");
    await ownerPage.waitForLoadState("domcontentloaded");

    const editor = ownerPage.locator(".cm-content").first();
    await expect(editor).toBeVisible({ timeout: 10000 });
    await editor.click();
    await editor.fill(description);

    const postButton = ownerPage.getByRole("button", { name: "Post" });
    await expect(postButton).toBeEnabled({ timeout: 5000 });
    await postButton.click();

    // Wait for redirect to the new posting page
    await ownerPage.waitForURL(/\/postings\/[a-f0-9-]+/, { timeout: 15000 });
    const postingUrl = ownerPage.url();
    const postingId = postingUrl.split("/postings/")[1]?.split("?")[0];

    // Verify the posting was created — "Back to postings" link confirms detail page
    await expect(
      ownerPage.locator('a:has-text("Back to postings")'),
    ).toBeVisible({ timeout: 10000 });

    // --- Developer navigates to posting ---
    await developerPage.goto(`/postings/${postingId}`);
    // Developer sees title in h1 (non-owner view)
    await expect(developerPage.locator("h1")).toContainText(
      `E2E Lifecycle ${uniqueId}`,
      { timeout: 10000 },
    );

    // --- Developer clicks "Request to join" ---
    const requestButton = developerPage.getByRole("button", {
      name: "Request to join",
    });
    await expect(requestButton).toBeVisible({ timeout: 5000 });
    await requestButton.click();

    // Fill cover message
    const coverTextarea = developerPage.locator("textarea").first();
    await expect(coverTextarea).toBeVisible({ timeout: 5000 });
    await coverTextarea.fill("I'd love to join this project!");

    // Submit the cover message (opens SmartAcceptanceCard)
    const submitRequest = developerPage.getByRole("button", {
      name: "Request to join",
    });
    await submitRequest.click();

    // Complete the SmartAcceptanceCard (select time slot if needed, then confirm)
    await completeAcceptanceCard(developerPage);

    // Developer sees "Request pending"
    await expect(developerPage.getByText("Request pending")).toBeVisible({
      timeout: 15000,
    });

    // --- Owner reloads and sees join request ---
    await ownerPage.reload();
    await expect(ownerPage.getByText("Join Requests")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      ownerPage.getByText(developerUser.full_name).first(),
    ).toBeVisible({ timeout: 5000 });
    await expect(ownerPage.getByText("New", { exact: true })).toBeVisible();

    // --- Owner accepts ---
    const acceptButton = ownerPage.getByRole("button", { name: "Accept" });
    await acceptButton.click();

    // Owner sees "Accepted" badge
    await expect(ownerPage.getByText("Accepted", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // --- Developer reloads and sees acceptance ---
    await developerPage.reload();
    await expect(developerPage.getByText("Accepted")).toBeVisible({
      timeout: 10000,
    });
  });

  test("auto-accept — instant join without pending state", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    const title = `E2E Auto-Accept ${Date.now()}`;

    // Seed posting via DB with auto_accept: true
    const posting = await seedPostingDirect({
      creator_id: ownerUser.id,
      title,
      description: "Auto-accept posting for E2E test.",
      category: "personal",
      status: "open",
      auto_accept: true,
      expires_at: expiresIn30Days(),
    });

    // --- Developer navigates to posting ---
    await developerPage.goto(`/postings/${posting.id}`);
    await expect(developerPage.locator("h1")).toContainText(title, {
      timeout: 10000,
    });

    // Developer sees "Join" button (auto-accept mode)
    const joinButton = developerPage.getByRole("button", { name: "Join" });
    await expect(joinButton).toBeVisible({ timeout: 5000 });
    await joinButton.click();

    // Complete the SmartAcceptanceCard
    await completeAcceptanceCard(developerPage);

    // Developer sees "Accepted" immediately (no pending state)
    await expect(developerPage.getByText("Accepted")).toBeVisible({
      timeout: 15000,
    });

    // --- Owner navigates and sees accepted member ---
    await ownerPage.goto(`/postings/${posting.id}`);
    await expect(
      ownerPage.getByText(developerUser.full_name).first(),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      ownerPage.getByText("Accepted", { exact: true }),
    ).toBeVisible();
  });

  test("rejection — owner declines application", async ({
    ownerPage,
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    const title = `E2E Rejection ${Date.now()}`;

    // Seed posting via DB (manual review, default auto_accept: false)
    const posting = await seedPostingDirect({
      creator_id: ownerUser.id,
      title,
      description: "Manual review posting for rejection E2E test.",
      category: "personal",
      status: "open",
      expires_at: expiresIn30Days(),
    });

    // --- Developer applies ---
    await developerPage.goto(`/postings/${posting.id}`);
    await expect(developerPage.locator("h1")).toContainText(title, {
      timeout: 10000,
    });

    const requestButton = developerPage.getByRole("button", {
      name: "Request to join",
    });
    await expect(requestButton).toBeVisible({ timeout: 5000 });
    await requestButton.click();

    const coverTextarea = developerPage.locator("textarea").first();
    await expect(coverTextarea).toBeVisible({ timeout: 5000 });
    await coverTextarea.fill("Interested in contributing!");

    const submitRequest = developerPage.getByRole("button", {
      name: "Request to join",
    });
    await submitRequest.click();

    // Complete the SmartAcceptanceCard
    await completeAcceptanceCard(developerPage);

    // Developer sees pending
    await expect(developerPage.getByText("Request pending")).toBeVisible({
      timeout: 15000,
    });

    // --- Owner navigates and declines ---
    await ownerPage.goto(`/postings/${posting.id}`);
    await expect(ownerPage.getByText("Join Requests")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      ownerPage.getByText(developerUser.full_name).first(),
    ).toBeVisible({ timeout: 5000 });

    const declineButton = ownerPage.getByRole("button", { name: "Decline" });
    await declineButton.click();

    // Owner sees "Declined" badge
    await expect(ownerPage.getByText("Declined", { exact: true })).toBeVisible({
      timeout: 10000,
    });

    // --- Developer reloads and sees rejection ---
    await developerPage.reload();
    await expect(developerPage.getByText("Not selected")).toBeVisible({
      timeout: 10000,
    });
  });
});
