/**
 * Layout test helpers.
 * Viewport presets, scrollable allowlist, and DOM-introspection
 * helpers for relational layout assertions in Playwright tests.
 */

import type { Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Viewport presets (used via page.setViewportSize, not Playwright projects)
// ---------------------------------------------------------------------------

export const VIEWPORTS = {
  mobile: { width: 375, height: 812 }, // iPhone SE / 14 baseline
  tablet: { width: 768, height: 1024 }, // Exactly the md: breakpoint
  desktop: { width: 1280, height: 720 }, // Standard laptop
} as const;

export type ViewportName = keyof typeof VIEWPORTS;

// ---------------------------------------------------------------------------
// Scrollable allowlist — selectors for containers that are *supposed* to scroll.
// Matched via element.matches() inside page.evaluate(), so standard CSS selectors.
// ---------------------------------------------------------------------------

export const SCROLLABLE_ALLOWLIST = [
  "aside", // Sidebar (md:overflow-y-auto)
  "div.flex.flex-1.flex-col", // AppShell scroll wrapper
  "[role='listbox']", // Select dropdowns
  "[data-radix-scroll-area-viewport]", // Radix scroll areas
] as const;

// ---------------------------------------------------------------------------
// Types for helper return values
// ---------------------------------------------------------------------------

export type OverflowViolation = {
  selector: string;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
};

export type TouchTargetViolation = {
  selector: string;
  width: number;
  height: number;
};

export type OverlapResult = {
  overlaps: boolean;
  rectA: { x: number; y: number; width: number; height: number } | null;
  rectB: { x: number; y: number; width: number; height: number } | null;
};

// ---------------------------------------------------------------------------
// 1. findOverflowViolations
//    Walks visible elements, finds those with computed overflow: auto|scroll
//    that are actually overflowing, excluding allowlisted selectors.
// ---------------------------------------------------------------------------

export async function findOverflowViolations(
  page: Page,
  allowlist: readonly string[] = SCROLLABLE_ALLOWLIST,
): Promise<OverflowViolation[]> {
  return page.evaluate(
    ({ allowlist }) => {
      const buildSelector = new Function(
        "el",
        `
        if (el.id) return el.tagName.toLowerCase() + '#' + el.id;
        let s = el.tagName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.trim().split(/\\s+/).slice(0, 3).join('.');
          if (classes) s += '.' + classes;
        }
        return s;
        `,
      ) as (el: Element) => string;

      function isAllowlisted(el: Element): boolean {
        for (const sel of allowlist) {
          if (el.matches(sel)) return true;
        }
        // Also allow children of allowlisted scrollers
        let parent = el.parentElement;
        while (parent) {
          for (const sel of allowlist) {
            if (parent.matches(sel)) return true;
          }
          parent = parent.parentElement;
        }
        return false;
      }

      const violations: {
        selector: string;
        scrollWidth: number;
        clientWidth: number;
        scrollHeight: number;
        clientHeight: number;
      }[] = [];

      const elements = document.querySelectorAll("*");
      for (const el of elements) {
        if (!(el instanceof HTMLElement)) continue;
        const style = getComputedStyle(el);
        const ox = style.overflowX;
        const oy = style.overflowY;
        const hasScrollableOverflow =
          ox === "auto" || ox === "scroll" || oy === "auto" || oy === "scroll";
        if (!hasScrollableOverflow) continue;

        const isOverflowing =
          el.scrollWidth > el.clientWidth + 1 ||
          el.scrollHeight > el.clientHeight + 1;
        if (!isOverflowing) continue;

        if (isAllowlisted(el)) continue;

        violations.push({
          selector: buildSelector(el),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          scrollHeight: el.scrollHeight,
          clientHeight: el.clientHeight,
        });
      }

      return violations;
    },
    { allowlist: [...allowlist] },
  );
}

// ---------------------------------------------------------------------------
// 2. checkNoHorizontalPageOverflow
//    Catches content bleeding off-screen horizontally.
// ---------------------------------------------------------------------------

export async function checkNoHorizontalPageOverflow(
  page: Page,
): Promise<{ overflows: boolean; scrollWidth: number; clientWidth: number }> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return {
      overflows: doc.scrollWidth > doc.clientWidth + 1,
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. checkPageHeight
//    Catches excessive vertical scrolling.
// ---------------------------------------------------------------------------

export async function checkPageHeight(
  page: Page,
  maxMultiplier: number,
): Promise<{
  exceeds: boolean;
  scrollHeight: number;
  viewportHeight: number;
  ratio: number;
}> {
  return page.evaluate(
    ({ maxMult }) => {
      const doc = document.documentElement;
      const viewportHeight = window.innerHeight;
      const scrollHeight = doc.scrollHeight;
      const ratio = scrollHeight / viewportHeight;
      return {
        exceeds: ratio >= maxMult,
        scrollHeight,
        viewportHeight,
        ratio: Math.round(ratio * 100) / 100,
      };
    },
    { maxMult: maxMultiplier },
  );
}

// ---------------------------------------------------------------------------
// 4. findSmallTouchTargets
//    Flags interactive elements where BOTH width AND height < minSize.
//    (WCAG 2.5.8: either dimension being >= 44px is acceptable.)
// ---------------------------------------------------------------------------

export async function findSmallTouchTargets(
  page: Page,
  minSize = 44,
  allowlist: readonly string[] = [],
): Promise<TouchTargetViolation[]> {
  return page.evaluate(
    ({ minSize, allowlist }) => {
      const buildSelector = new Function(
        "el",
        `
        if (el.id) return el.tagName.toLowerCase() + '#' + el.id;
        let s = el.tagName.toLowerCase();
        if (el.className && typeof el.className === 'string') {
          const classes = el.className.trim().split(/\\s+/).slice(0, 3).join('.');
          if (classes) s += '.' + classes;
        }
        return s;
        `,
      ) as (el: Element) => string;

      function isAllowlisted(el: Element): boolean {
        for (const sel of allowlist) {
          if (el.matches(sel)) return true;
        }
        return false;
      }

      const interactiveSelectors =
        'a, button, input, select, textarea, [role="button"], [tabindex="0"]';
      const elements = document.querySelectorAll(interactiveSelectors);
      const violations: { selector: string; width: number; height: number }[] =
        [];

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        // Skip hidden or zero-size elements
        if (rect.width === 0 || rect.height === 0) continue;
        // Skip elements not in viewport (offscreen)
        if (
          rect.bottom < 0 ||
          rect.top > window.innerHeight ||
          rect.right < 0 ||
          rect.left > window.innerWidth
        )
          continue;
        const style = getComputedStyle(el);
        // Skip hidden via visibility/display
        if (style.display === "none" || style.visibility === "hidden") continue;
        // Skip sr-only elements (visually hidden, for screen readers)
        if (
          el.classList.contains("sr-only") ||
          (style.position === "absolute" &&
            style.clip === "rect(0px, 0px, 0px, 0px)")
        )
          continue;
        // Skip inline links — WCAG 2.5.8 exempts inline targets
        if (el.tagName === "A" && style.display === "inline") continue;
        // Skip allowlisted elements
        if (isAllowlisted(el)) continue;

        // Flag only when BOTH dimensions are too small
        if (rect.width < minSize && rect.height < minSize) {
          violations.push({
            selector: buildSelector(el),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }

      return violations;
    },
    { minSize, allowlist: [...allowlist] },
  );
}

// ---------------------------------------------------------------------------
// 5. checkElementsDoNotOverlap
//    Compares bounding rects of two elements.
// ---------------------------------------------------------------------------

export async function checkElementsDoNotOverlap(
  page: Page,
  selectorA: string,
  selectorB: string,
): Promise<OverlapResult> {
  return page.evaluate(
    ({ selA, selB }) => {
      const elA = document.querySelector(selA);
      const elB = document.querySelector(selB);

      if (!elA || !elB) {
        return {
          overlaps: false,
          rectA: elA
            ? (() => {
                const r = elA.getBoundingClientRect();
                return {
                  x: r.x,
                  y: r.y,
                  width: r.width,
                  height: r.height,
                };
              })()
            : null,
          rectB: elB
            ? (() => {
                const r = elB.getBoundingClientRect();
                return {
                  x: r.x,
                  y: r.y,
                  width: r.width,
                  height: r.height,
                };
              })()
            : null,
        };
      }

      const a = elA.getBoundingClientRect();
      const b = elB.getBoundingClientRect();

      const overlaps = !(
        a.right <= b.left ||
        a.left >= b.right ||
        a.bottom <= b.top ||
        a.top >= b.bottom
      );

      return {
        overlaps,
        rectA: { x: a.x, y: a.y, width: a.width, height: a.height },
        rectB: { x: b.x, y: b.y, width: b.width, height: b.height },
      };
    },
    { selA: selectorA, selB: selectorB },
  );
}
