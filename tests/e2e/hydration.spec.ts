/**
 * Hydration error tests.
 * Navigates to key authenticated pages and asserts that no React hydration
 * errors appear in the browser console or as uncaught page errors.
 *
 * These catch server/client DOM mismatches caused by isLoading branching,
 * missing Suspense boundaries, or SWRFallback data shape divergence.
 */

import { test, expect } from "@playwright/test";

const hasAuth = !!process.env.TEST_USER_PASSWORD;

const AUTHED_PAGES = [
  { path: "/spaces", name: "Spaces" },
  { path: "/activity", name: "Activity" },
  { path: "/profile", name: "Profile" },
];

const HYDRATION_PATTERNS = [
  /parentNode/i,
  /hydration failed/i,
  /text content does not match/i,
  /did not match/i,
  /minified react error/i,
  /there was an error while hydrating/i,
  /hydration mismatch/i,
];

function isHydrationError(text: string): boolean {
  return HYDRATION_PATTERNS.some((pattern) => pattern.test(text));
}

test.describe("Hydration", () => {
  for (const { path, name } of AUTHED_PAGES) {
    test(`${name} (${path}) has no hydration errors`, async ({ page }) => {
      test.skip(!hasAuth, "TEST_USER_PASSWORD not set");

      const errors: string[] = [];

      page.on("pageerror", (err) => {
        if (isHydrationError(err.message)) {
          errors.push(`[pageerror] ${err.message}`);
        }
      });

      page.on("console", (msg) => {
        if (msg.type() === "error" && isHydrationError(msg.text())) {
          errors.push(`[console.error] ${msg.text()}`);
        }
      });

      await page.goto(path);
      await page.waitForLoadState("networkidle");

      expect(errors, `Hydration errors on ${path}`).toEqual([]);
    });
  }
});
