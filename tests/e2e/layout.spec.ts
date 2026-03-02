/**
 * Layout assertion tests.
 * Relational layout checks across viewports — catches cut elements,
 * wrong sizing, excessive scrolling, and overlap bugs.
 *
 * Public pages run without auth. Authenticated pages use loginAsUser()
 * and skip gracefully when TEST_USER_PASSWORD is unset.
 */

import { test, expect } from "@playwright/test";
import { loginAsUser } from "../utils/auth-helpers";
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
} from "../utils/layout-helpers";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const hasAuth = !!process.env.TEST_USER_PASSWORD;

const TEST_USER = {
  email: "ajb60721@gmail.com",
  password: process.env.TEST_USER_PASSWORD ?? "",
};

const PUBLIC_PAGES = [
  { path: "/", name: "Landing" },
  { path: "/login", name: "Login" },
  { path: "/signup", name: "Signup" },
];

const AUTHED_PAGES = [
  { path: "/posts", name: "Posts" },
  { path: "/discover", name: "Discover" },
  { path: "/connections", name: "Connections" },
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
  "/posts": 2, // AppShell h-dvh
  "/discover": 2, // AppShell h-dvh
  "/connections": 2, // AppShell h-dvh
  "/profile": 3, // Profile may have some content
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAuthedPage(path: string): boolean {
  return AUTHED_PAGES.some((p) => p.path === path);
}

async function navigateToPage(
  page: import("@playwright/test").Page,
  path: string,
  viewport: ViewportName,
  authenticated: boolean,
) {
  await page.setViewportSize(VIEWPORTS[viewport]);

  if (authenticated && isAuthedPage(path)) {
    await loginAsUser(page, TEST_USER);
  }

  await page.goto(path, { waitUntil: "load" });
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
        await navigateToPage(page, path, viewport, true);

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
        await navigateToPage(page, path, viewport, true);

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
      await navigateToPage(page, path, "mobile", true);

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

  test("Posts — header + bottom bar + page heading visible (mobile)", async ({
    page,
  }) => {
    test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
    await navigateToPage(page, "/posts", "mobile", true);

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

  test("Posts — sidebar + header visible, bottom bar hidden (desktop)", async ({
    page,
  }) => {
    test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
    await navigateToPage(page, "/posts", "desktop", true);

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
        await navigateToPage(page, path, viewport, true);

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
  test("FAB does not overlap bottom bar (mobile)", async ({ page }) => {
    test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
    await navigateToPage(page, "/posts", "mobile", true);

    const result = await checkElementsDoNotOverlap(
      page,
      'a[href="/postings/new"]',
      'nav[role="navigation"][aria-label="Tab navigation"]',
    );
    expect(
      result.overlaps,
      `FAB overlaps bottom bar — FAB: ${JSON.stringify(result.rectA)}, BottomBar: ${JSON.stringify(result.rectB)}`,
    ).toBe(false);
  });

  test("Header does not overlap main content (mobile)", async ({ page }) => {
    test.skip(!hasAuth, "TEST_USER_PASSWORD not set");
    await navigateToPage(page, "/posts", "mobile", true);

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
        await navigateToPage(page, path, viewport, true);

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
        await navigateToPage(page, path, viewport, true);

        const violations = await findViewportExceedingElements(page);
        expect(
          violations,
          `Elements exceed viewport on ${path} @ ${viewport}: ${JSON.stringify(violations)}`,
        ).toEqual([]);
      });
    }
  }
});
