/**
 * Invite Lifecycle E2E Tests
 *
 * Tests the sequential invite flow end-to-end:
 * owner seeds a friend_ask posting -> developer (invitee) accepts or declines.
 *
 * Uses multi-context fixture for two simultaneous browser sessions.
 */

import { test, expect } from "../fixtures/multi-context";
import { seedPostingDirect, seedFriendAskDirect } from "../utils/seed-helpers";

function expiresIn30Days(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

test.describe("Invite Lifecycle", () => {
  test("accept — invitee joins a sequential invite posting", async ({
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    // Seed a private friend_ask posting with developer in the invite list
    const posting = await seedPostingDirect({
      creator_id: ownerUser.id,
      title: `E2E Invite Accept ${Date.now()}`,
      description: "Sequential invite acceptance test.",
      category: "personal",
      status: "open",
      visibility: "private",
      mode: "friend_ask",
      expires_at: expiresIn30Days(),
    });

    await seedFriendAskDirect({
      posting_id: posting.id,
      creator_id: ownerUser.id,
      ordered_friend_list: [developerUser.id],
      pending_invitees: [developerUser.id],
      invite_mode: "sequential",
      status: "pending",
      current_request_index: 0,
    });

    // Developer navigates to the posting
    await developerPage.goto(`/postings/${posting.id}`);

    // Developer sees the invite card
    await expect(
      developerPage.getByText("You\u2019ve been invited!"),
    ).toBeVisible({ timeout: 15000 });

    // Developer clicks "Join"
    const joinButton = developerPage.getByRole("button", {
      name: "Join",
      exact: true,
    });
    await expect(joinButton).toBeVisible({ timeout: 5000 });
    await joinButton.click();

    // Developer sees confirmation
    await expect(
      developerPage.getByText("You joined this posting!"),
    ).toBeVisible({ timeout: 15000 });
  });

  test("decline — invitee declines a sequential invite posting", async ({
    ownerUser,
    developerPage,
    developerUser,
  }) => {
    // Seed a private friend_ask posting with developer in the invite list
    const posting = await seedPostingDirect({
      creator_id: ownerUser.id,
      title: `E2E Invite Decline ${Date.now()}`,
      description: "Sequential invite decline test.",
      category: "personal",
      status: "open",
      visibility: "private",
      mode: "friend_ask",
      expires_at: expiresIn30Days(),
    });

    await seedFriendAskDirect({
      posting_id: posting.id,
      creator_id: ownerUser.id,
      ordered_friend_list: [developerUser.id],
      pending_invitees: [developerUser.id],
      invite_mode: "sequential",
      status: "pending",
      current_request_index: 0,
    });

    // Developer navigates to the posting
    await developerPage.goto(`/postings/${posting.id}`);

    // Developer sees the invite card
    await expect(
      developerPage.getByText("You\u2019ve been invited!"),
    ).toBeVisible({ timeout: 15000 });

    // Developer clicks "Do not join"
    const declineButton = developerPage.getByRole("button", {
      name: "Do not join",
    });
    await expect(declineButton).toBeVisible({ timeout: 5000 });
    await declineButton.click();

    // Developer sees decline confirmation
    await expect(
      developerPage.getByText("You declined this invite."),
    ).toBeVisible({ timeout: 15000 });
  });
});
