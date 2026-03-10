/**
 * Posting Creation E2E Tests
 *
 * Tests the core posting creation flow using the text-first editor.
 * The posting page uses a CodeMirror-based MeshEditor for the description,
 * then POSTs to /api/postings and redirects to /postings/:id.
 */

import { test, expect } from "../fixtures/authenticated";

test.describe("Posting Creation", () => {
  test("owner can create a posting via the text editor", async ({
    ownerPage,
    ownerUser,
  }) => {
    // Navigate to posting creation page
    await ownerPage.goto("/postings/new");

    // Verify the page loaded — the "Post" button should be visible but disabled
    const postButton = ownerPage.getByRole("button", { name: "Post" });
    await expect(postButton).toBeVisible();
    await expect(postButton).toBeDisabled();

    // The MeshEditor renders a CodeMirror instance with .cm-content
    const editor = ownerPage.locator(".cm-content").first();
    await expect(editor).toBeVisible();

    // Type a posting description into the CodeMirror editor
    const postingDescription =
      "Looking for a React developer to build a side project together. " +
      "We will work on a task management app using Next.js and Supabase.";
    await editor.click();
    await editor.fill(postingDescription);

    // The Post button should now be enabled
    await expect(postButton).toBeEnabled();

    // Submit the posting
    await postButton.click();

    // Should redirect to the new posting detail page
    await ownerPage.waitForURL(/\/postings\/[a-f0-9-]+/, { timeout: 15000 });
    expect(ownerPage.url()).toMatch(/\/postings\/[a-f0-9-]+/);

    // The posting description text should appear on the detail page
    await expect(
      ownerPage.locator("text=Looking for a React developer"),
    ).toBeVisible({ timeout: 10000 });
  });

   
  test("posting creation shows error when description is empty", async ({
    ownerPage,
    ownerUser,
  }) => {
    await ownerPage.goto("/postings/new");

    // The Post button should be disabled when the editor is empty
    const postButton = ownerPage.getByRole("button", { name: "Post" });
    await expect(postButton).toBeDisabled();
  });

  test("back link navigates to postings list", async ({
    ownerPage,
    ownerUser,
  }) => {
    await ownerPage.goto("/postings/new");

    // The "Back to postings" link should be visible
    const backLink = ownerPage.locator('a:has-text("Back to postings")');
    await expect(backLink).toBeVisible();

    await backLink.click();
    await ownerPage.waitForURL("**/posts", { timeout: 5000 });
    expect(ownerPage.url()).toContain("/posts");
  });
});
