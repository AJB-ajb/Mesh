/**
 * Layout assertion tests.
 * Relational layout checks across viewports — catches cut elements,
 * wrong sizing, excessive scrolling, and overlap bugs.
 *
 * Public pages run without auth. Authenticated pages reuse the session
 * saved by auth.setup.ts (storageState) and skip when TEST_USER_PASSWORD
 * is unset.
 */

import { test, expect } from "@playwright/test";
import {
  VIEWPORTS,
  type ViewportName,
  findOverflowViolations,
  checkNoHorizontalPageOverflow,
  checkPageHeight,
  findSmallTouchTargets,
  checkElementsDoNotOverlap,
  findHiddenOverflowViolations,
  findViewportExceedingElements,
  findClippedPositionedElements,
  checkMinimumSpacing,
  findLongTextOverflowViolations,
} from "../utils/layout-helpers";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const hasAuth = !!process.env.TEST_USER_PASSWORD;

const PUBLIC_PAGES = [
  { path: "/", name: "Landing" },
  { path: "/login", name: "Login" },
  { path: "/signup", name: "Signup" },
];

const AUTHED_PAGES = [
  { path: "/spaces", name: "Spaces" },
  { path: "/activity", name: "Activity" },
  { path: "/profile", name: "Profile" },
];

const ALL_VIEWPORTS: ViewportName[] = ["mobile", "tablet", "desktop"];

// Known small touch targets — pre-existing design-system choices, not layout bugs.
// ThemeToggle on public pages uses size="icon" (36px) without mobile override.
// Filter chips (pill buttons) and shadcn Button variants are intentional sizes.
const TOUCH_TARGET_ALLOWLIST = [
  "button:has(> .sr-only)", // ThemeToggle has sr-only label inside
  "button.rounded-full", // Filter chips (pill buttons, ~32px tall)
  '[data-slot="button"]', // shadcn Button components — design-system size choices
] as const;

// Page height limits (multiplier of viewport height)
const PAGE_HEIGHT_LIMITS: Record<string, number> = {
  "/": 8, // Landing page — many sections, expected to be tall
  "/login": 3, // Auth card
  "/signup": 3, // Auth card
  "/spaces": 2, // AppShell h-dvh
  "/activity": 2, // AppShell h-dvh
  "/profile": 3, // Profile may have some content
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function navigateToPage(
  page: import("@playwright/test").Page,
  path: string,
  viewport: ViewportName,
) {
  await page.setViewportSize(VIEWPORTS[viewport]);
  await page.goto(path, { waitUntil: "load" });

  // Fail loudly if middleware redirected to /login — the storageState session
  // may have expired or Supabase rejected the token under load.
  const url = new URL(page.url());
  if (url.pathname.startsWith("/login") && !path.startsWith("/login")) {
    throw new Error(
      `Auth redirect: navigated to ${path} but landed on ${url.pathname}. ` +
        `storageState session invalid or Supabase getUser() failed.`,
    );
  }

  // Give layout a moment to settle after load (SWR hydration, etc.)
  await page.waitForTimeout(1000);
}

// ---------------------------------------------------------------------------
// Group 1: No horizontal page overflow
// ---------------------------------------------------------------------------

test.describe("Layout > No horizontal overflow", () => {
  for (const viewport of ALL_VIEWPORTS) {
    for (const { path, name } of PUBLIC_PAGES) {
      test(`${name} (${path}) — ${viewport}`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS[viewport]);
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);

        const result = await checkNoHorizontalPageOverflow(page);
        expect(
          result.overflows,
          `Horizontal overflow on ${path} @ ${viewport}: scrollWidth=${result.scrollWidth}, clientWidth=${result.clientWidth}`,
        ).toBe(false);
      });
    }

    for (const { path, name } of AUTHED_PAGES) {
      test(`${name} (${path}) — ${viewport}`, async ({ page }) => {
        test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
        await navigateToPage(page, path, viewport);

        const result = await checkNoHorizontalPageOverflow(page);
        expect(
          result.overflows,
          `Horizontal overflow on ${path} @ ${viewport}: scrollWidth=${result.scrollWidth}, clientWidth=${result.clientWidth}`,
        ).toBe(false);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Group 2: No unexpected overflow containers
// ---------------------------------------------------------------------------

test.describe("Layout > No unexpected overflow containers", () => {
  for (const viewport of ALL_VIEWPORTS) {
    for (const { path, name } of PUBLIC_PAGES) {
      test(`${name} (${path}) — ${viewport}`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS[viewport]);
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);

        const violations = await findOverflowViolations(page);
        expect(
          violations,
          `Unexpected overflow containers on ${path} @ ${viewport}: ${JSON.stringify(violations)}`,
        ).toEqual([]);
      });
    }

    for (const { path, name } of AUTHED_PAGES) {
      test(`${name} (${path}) — ${viewport}`, async ({ page }) => {
        test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
        await navigateToPage(page, path, viewport);

        const violations = await findOverflowViolations(page);
        expect(
          violations,
          `Unexpected overflow containers on ${path} @ ${viewport}: ${JSON.stringify(violations)}`,
        ).toEqual([]);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Group 3: Touch targets >= 44px (mobile only)
// ---------------------------------------------------------------------------

test.describe("Layout > Touch targets", () => {
  for (const { path, name } of PUBLIC_PAGES) {
    test(`${name} (${path}) — mobile`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(300);

      const violations = await findSmallTouchTargets(
        page,
        44,
        TOUCH_TARGET_ALLOWLIST,
      );
      expect(
        violations,
        `Small touch targets on ${path}: ${JSON.stringify(violations)}`,
      ).toEqual([]);
    });
  }

  for (const { path, name } of AUTHED_PAGES) {
    test(`${name} (${path}) — mobile`, async ({ page }) => {
      test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
      await navigateToPage(page, path, "mobile");

      const violations = await findSmallTouchTargets(
        page,
        44,
        TOUCH_TARGET_ALLOWLIST,
      );
      expect(
        violations,
        `Small touch targets on ${path}: ${JSON.stringify(violations)}`,
      ).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 4: Viewport containment — key elements visible without scrolling
// ---------------------------------------------------------------------------

test.describe("Layout > Viewport containment", () => {
  // Landing & Login tests need a clean (unauthenticated) context because
  // authed users are redirected away from these public pages.
  test.describe("Public pages", () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test("Landing — header + CTA visible (mobile)", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto("/", { waitUntil: "domcontentloaded" });

      await expect(page.locator("header")).toBeVisible();
      const cta = page
        .locator('a[href*="/login"]:has-text("Post something")')
        .first();
      await expect(cta).toBeInViewport();
    });

    test("Landing — header + CTA visible (desktop)", async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.desktop);
      await page.goto("/", { waitUntil: "domcontentloaded" });

      await expect(page.locator("header")).toBeVisible();
      const cta = page
        .locator('a[href*="/login"]:has-text("Post something")')
        .first();
      await expect(cta).toBeInViewport();
    });

    test("Login — heading + submit in viewport without scrolling (mobile)", async ({
      page,
    }) => {
      await page.setViewportSize(VIEWPORTS.mobile);
      await page.goto("/login", { waitUntil: "domcontentloaded" });

      await expect(page.locator("h1")).toBeInViewport();
      await expect(page.locator('button[type="submit"]')).toBeInViewport();
    });
  });

  test("Spaces — header + bottom bar + page heading visible (mobile)", async ({
    page,
  }) => {
    test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
    await navigateToPage(page, "/spaces", "mobile");

    await expect(page.locator("header")).toBeVisible();
    await expect(
      page.locator('nav[role="navigation"][aria-label="Tab navigation"]'),
    ).toBeVisible();
    // Page heading (h1 or similar) should be in viewport
    const heading = page
      .locator("main#main-content h1, main#main-content h2")
      .first();
    await expect(heading).toBeInViewport();
  });

  test("Spaces — sidebar + header visible, bottom bar hidden (desktop)", async ({
    page,
  }) => {
    test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
    await navigateToPage(page, "/spaces", "desktop");

    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("aside")).toBeVisible();
    // Bottom bar should be hidden on desktop (md:hidden)
    await expect(
      page.locator('nav[role="navigation"][aria-label="Tab navigation"]'),
    ).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// Group 5: Reasonable page height
// ---------------------------------------------------------------------------

test.describe("Layout > Page height", () => {
  for (const viewport of ALL_VIEWPORTS) {
    for (const { path, name } of PUBLIC_PAGES) {
      const maxMult = PAGE_HEIGHT_LIMITS[path] ?? 3;
      test(`${name} (${path}) < ${maxMult}× viewport — ${viewport}`, async ({
        page,
      }) => {
        await page.setViewportSize(VIEWPORTS[viewport]);
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);

        const result = await checkPageHeight(page, maxMult);
        expect(
          result.exceeds,
          `Page too tall: ${path} @ ${viewport} — ${result.ratio}× viewport (limit: ${maxMult}×), scrollHeight=${result.scrollHeight}, viewportHeight=${result.viewportHeight}`,
        ).toBe(false);
      });
    }

    for (const { path, name } of AUTHED_PAGES) {
      const maxMult = PAGE_HEIGHT_LIMITS[path] ?? 3;
      test(`${name} (${path}) < ${maxMult}× viewport — ${viewport}`, async ({
        page,
      }) => {
        test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
        await navigateToPage(page, path, viewport);

        const result = await checkPageHeight(page, maxMult);
        expect(
          result.exceeds,
          `Page too tall: ${path} @ ${viewport} — ${result.ratio}× viewport (limit: ${maxMult}×), scrollHeight=${result.scrollHeight}, viewportHeight=${result.viewportHeight}`,
        ).toBe(false);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Group 6: Element non-overlap (mobile only)
// ---------------------------------------------------------------------------

test.describe("Layout > Element overlap", () => {
  test("Header does not overlap main content (mobile)", async ({ page }) => {
    test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
    await navigateToPage(page, "/spaces", "mobile");

    const result = await checkElementsDoNotOverlap(
      page,
      "header",
      "main#main-content",
    );
    expect(
      result.overlaps,
      `Header overlaps main — Header: ${JSON.stringify(result.rectA)}, Main: ${JSON.stringify(result.rectB)}`,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group 7: No hidden horizontal overflow
//   Catches containers with overflow-x: hidden that silently clip content.
// ---------------------------------------------------------------------------

test.describe("Layout > No hidden horizontal overflow", () => {
  for (const viewport of ALL_VIEWPORTS) {
    for (const { path, name } of PUBLIC_PAGES) {
      test(`${name} (${path}) — ${viewport}`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS[viewport]);
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);

        const violations = await findHiddenOverflowViolations(page);
        expect(
          violations,
          `Hidden overflow clipping on ${path} @ ${viewport}: ${JSON.stringify(violations)}`,
        ).toEqual([]);
      });
    }

    for (const { path, name } of AUTHED_PAGES) {
      test(`${name} (${path}) — ${viewport}`, async ({ page }) => {
        test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
        await navigateToPage(page, path, viewport);

        const violations = await findHiddenOverflowViolations(page);
        expect(
          violations,
          `Hidden overflow clipping on ${path} @ ${viewport}: ${JSON.stringify(violations)}`,
        ).toEqual([]);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Group 8: Content within viewport bounds
//   Catches individual elements whose bounding rect extends past the viewport.
// ---------------------------------------------------------------------------

test.describe("Layout > Content within viewport bounds", () => {
  for (const viewport of ALL_VIEWPORTS) {
    for (const { path, name } of PUBLIC_PAGES) {
      test(`${name} (${path}) — ${viewport}`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS[viewport]);
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);

        const violations = await findViewportExceedingElements(page);
        expect(
          violations,
          `Elements exceed viewport on ${path} @ ${viewport}: ${JSON.stringify(violations)}`,
        ).toEqual([]);
      });
    }

    for (const { path, name } of AUTHED_PAGES) {
      test(`${name} (${path}) — ${viewport}`, async ({ page }) => {
        test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
        await navigateToPage(page, path, viewport);

        const violations = await findViewportExceedingElements(page);
        expect(
          violations,
          `Elements exceed viewport on ${path} @ ${viewport}: ${JSON.stringify(violations)}`,
        ).toEqual([]);
      });
    }
  }
});

// ---------------------------------------------------------------------------
// Group 9: No clipped positioned elements
//   Catches absolutely/fixed positioned children (badges, indicators, tooltips)
//   that extend beyond a clipping ancestor and are visually cut off.
//   This is the gap that let the notification bell badge cutoff slip through —
//   findHiddenOverflowViolations only checks scrollWidth, but absolute elements
//   don't affect scrollWidth.
// ---------------------------------------------------------------------------

// Allowlist for elements that are intentionally clipped by design:
// - Radix popovers/tooltips manage their own positioning
// - Dusk mode grain texture overlay (body::before pseudo — not a real element)
const CLIPPED_ELEMENT_ALLOWLIST = [
  "[data-radix-popper-content-wrapper]",
  "[data-radix-scroll-area-viewport]",
] as const;

test.describe("Layout > No clipped positioned elements", () => {
  for (const viewport of ALL_VIEWPORTS) {
    for (const { path, name } of PUBLIC_PAGES) {
      test(`${name} (${path}) — ${viewport}`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS[viewport]);
        await page.goto(path, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(300);

        const violations = await findClippedPositionedElements(
          page,
          CLIPPED_ELEMENT_ALLOWLIST,
        );
        expect(
          violations,
          `Clipped positioned elements on ${path} @ ${viewport}: ${JSON.stringify(violations, null, 2)}`,
        ).toEqual([]);
      });
    }

    for (const { path, name } of AUTHED_PAGES) {
      test(`${name} (${path}) — ${viewport}`, async ({ page }) => {
        test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
        await navigateToPage(page, path, viewport);

        const violations = await findClippedPositionedElements(
          page,
          CLIPPED_ELEMENT_ALLOWLIST,
        );
        expect(
          violations,
          `Clipped positioned elements on ${path} @ ${viewport}: ${JSON.stringify(violations, null, 2)}`,
        ).toEqual([]);
      });
    }
  }
});

// Group 10: Connections chat view — REMOVED (connections page replaced by spaces)

// ---------------------------------------------------------------------------
// Group 11: Minimum vertical spacing between key layout regions
//   Catches cramped layouts where the header bar sits too close to page
//   content, or filter rows sit flush against the first card. Checks the
//   vertical gap between two elements meets a minimum pixel threshold.
// ---------------------------------------------------------------------------

test.describe("Layout > Minimum spacing", () => {
  // Header bar to main content — should have visible breathing room
  for (const { path, name } of AUTHED_PAGES) {
    test(`${name} — header to main gap >= 12px (mobile)`, async ({ page }) => {
      test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
      await navigateToPage(page, path, "mobile");

      const result = await checkMinimumSpacing(
        page,
        "header",
        "main#main-content > *:first-child",
        12,
      );
      expect(
        result.tooTight,
        `Header-to-content gap on ${path} (mobile): ${result.gapPx}px < ${result.requiredPx}px — rectA: ${JSON.stringify(result.rectA)}, rectB: ${JSON.stringify(result.rectB)}`,
      ).toBe(false);
    });

    test(`${name} — header to main gap >= 16px (desktop)`, async ({ page }) => {
      test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
      await navigateToPage(page, path, "desktop");

      const result = await checkMinimumSpacing(
        page,
        "header",
        "main#main-content > *:first-child",
        16,
      );
      expect(
        result.tooTight,
        `Header-to-content gap on ${path} (desktop): ${result.gapPx}px < ${result.requiredPx}px — rectA: ${JSON.stringify(result.rectA)}, rectB: ${JSON.stringify(result.rectB)}`,
      ).toBe(false);
    });
  }
});

// ---------------------------------------------------------------------------
// Group 12: Long text overflow stress test (mobile)
//   Injects very long text into text elements to verify that all containers
//   handle overflow gracefully — via truncation, word-break, or overflow
//   constraints. Catches bugs where short test data masks missing CSS rules.
// ---------------------------------------------------------------------------

// Allowlist: elements/containers where overflow is handled at a higher level
// or where long text injection is not meaningful.
const LONG_TEXT_ALLOWLIST = [
  "nav", // Navigation labels are fixed
  "header", // App header — fixed labels
  '[role="navigation"]', // Bottom bar — fixed labels
  "[data-radix-scroll-area-viewport]", // Radix scroll areas handle overflow
  ".sr-only", // Screen-reader-only elements
  "textarea", // Textareas have their own scroll
  "input", // Inputs have their own scroll
  "code", // Inline code may intentionally overflow (wrapped by pre/scroll)
  "time", // Time elements are fixed-width content
  '[data-slot="button"]', // shadcn buttons — controlled labels
] as const;

test.describe("Layout > Long text overflow (mobile)", () => {
  // Test user-content areas: markdown descriptions, cards, user-generated text.
  // Static UI labels (page headings, buttons, nav) are excluded — they're
  // controlled strings from labels.ts and will never be arbitrarily long.

  test("Markdown content handles long text without overflow", async ({
    page,
  }) => {
    test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
    // Navigate to a page with markdown content — spaces has posting cards
    await navigateToPage(page, "/spaces", "mobile");

    const hasMarkdown = (await page.locator(".markdown-content").count()) > 0;
    test.skip(!hasMarkdown, "No markdown content on page");

    const violations = await findLongTextOverflowViolations(
      page,
      ".markdown-content",
      LONG_TEXT_ALLOWLIST,
    );
    expect(
      violations,
      `Markdown content overflows with long text: ${JSON.stringify(violations, null, 2)}`,
    ).toEqual([]);
  });

  // Test all authenticated pages for user-content text overflow.
  // Scoped to Card components which contain user-generated content
  // (posting descriptions, profile info, connection cards, etc.)
  for (const { path, name } of AUTHED_PAGES) {
    test(`${name} (${path}) — cards handle long text`, async ({ page }) => {
      test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
      await navigateToPage(page, path, "mobile");

      const hasCards = (await page.locator('[data-slot="card"]').count()) > 0;
      test.skip(!hasCards, "No card components on page");

      const violations = await findLongTextOverflowViolations(
        page,
        '[data-slot="card"]',
        LONG_TEXT_ALLOWLIST,
      );
      expect(
        violations,
        `Card content overflows on ${path} (mobile): ${JSON.stringify(violations, null, 2)}`,
      ).toEqual([]);
    });
  }
});

// Group 13: Connections chat long text — REMOVED (connections page replaced by spaces)
