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

export type HiddenOverflowViolation = {
  selector: string;
  scrollWidth: number;
  clientWidth: number;
  excessPx: number;
};

export type ViewportExceedingViolation = {
  selector: string;
  right: number;
  left: number;
  viewportWidth: number;
  excessPx: number;
};

export type ClippedElementViolation = {
  /** Selector for the clipped child element */
  childSelector: string;
  /** Selector for the ancestor that clips it */
  clipParentSelector: string;
  /** How many pixels are clipped on each side */
  clippedPx: { top: number; right: number; bottom: number; left: number };
};

export type SpacingResult = {
  /** Whether the measured gap is below the required minimum */
  tooTight: boolean;
  /** The measured gap in pixels (negative means overlap) */
  gapPx: number;
  /** The required minimum gap */
  requiredPx: number;
  /** Bounding rects used for the measurement */
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

// ---------------------------------------------------------------------------
// Allowlist for hidden-overflow containers that intentionally clip content.
// ---------------------------------------------------------------------------

export const HIDDEN_OVERFLOW_ALLOWLIST = [
  ...SCROLLABLE_ALLOWLIST,
  ".truncate", // Intentional text truncation
  "[class*='line-clamp']", // Intentional multi-line clamping
  ".overflow-x-auto", // Horizontally scrollable by design
  ".sr-only", // Screen-reader-only elements (intentionally clipped to 1px)
] as const;

// ---------------------------------------------------------------------------
// 6. findHiddenOverflowViolations
//    Detects containers with overflow-x: hidden whose scrollWidth > clientWidth,
//    meaning they are silently clipping content wider than the container.
// ---------------------------------------------------------------------------

export async function findHiddenOverflowViolations(
  page: Page,
  allowlist: readonly string[] = HIDDEN_OVERFLOW_ALLOWLIST,
): Promise<HiddenOverflowViolation[]> {
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
          try {
            if (el.matches(sel)) return true;
          } catch {
            // Invalid selector, skip
          }
        }
        // Also allow children of allowlisted containers
        let parent = el.parentElement;
        while (parent) {
          for (const sel of allowlist) {
            try {
              if (parent.matches(sel)) return true;
            } catch {
              // Invalid selector, skip
            }
          }
          parent = parent.parentElement;
        }
        return false;
      }

      const violations: {
        selector: string;
        scrollWidth: number;
        clientWidth: number;
        excessPx: number;
      }[] = [];

      const elements = document.querySelectorAll("*");
      for (const el of elements) {
        if (!(el instanceof HTMLElement)) continue;
        const style = getComputedStyle(el);
        const ox = style.overflowX;
        // Only check elements with overflow-x: hidden
        if (ox !== "hidden") continue;

        // Skip sr-only elements — they use overflow:hidden by design
        if (
          el.classList.contains("sr-only") ||
          (style.position === "absolute" &&
            style.clip === "rect(0px, 0px, 0px, 0px)")
        )
          continue;

        // 1px tolerance for rounding
        const excess = el.scrollWidth - el.clientWidth;
        if (excess <= 1) continue;

        if (isAllowlisted(el)) continue;

        violations.push({
          selector: buildSelector(el),
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
          excessPx: excess,
        });
      }

      return violations;
    },
    { allowlist: [...allowlist] },
  );
}

// ---------------------------------------------------------------------------
// 7. findViewportExceedingElements
//    Walks visible content elements and flags those whose bounding rect
//    extends beyond the viewport edges (right or left).
// ---------------------------------------------------------------------------

export async function findViewportExceedingElements(
  page: Page,
): Promise<ViewportExceedingViolation[]> {
  return page.evaluate(() => {
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

    const vpWidth = window.innerWidth;
    const TOLERANCE = 1; // 1px rounding tolerance

    // Only check meaningful content elements
    const contentSelectors = [
      "[data-slot='card']", // shadcn Card components
      "button",
      "a",
      "input",
      "select",
      "textarea",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "img",
      "[role='button']",
      "[role='group']",
      ".flex", // Flex containers often cause overflow
    ].join(", ");

    // Check if element is inside a container that clips or scrolls horizontally.
    // Elements inside overflow-x: hidden/auto/scroll ancestors are not truly
    // visible beyond the viewport — hidden-overflow bugs are caught by
    // findHiddenOverflowViolations instead.
    function isInsideHorizontalClipOrScroll(el: Element): boolean {
      let parent = el.parentElement;
      while (parent && parent !== document.documentElement) {
        const ps = getComputedStyle(parent);
        const ox = ps.overflowX;
        if (ox === "hidden" || ox === "auto" || ox === "scroll") {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    }

    const elements = document.querySelectorAll(contentSelectors);
    const violatingEls: Element[] = [];

    for (const el of elements) {
      if (!(el instanceof HTMLElement)) continue;

      const rect = el.getBoundingClientRect();
      // Skip zero-size or invisible elements
      if (rect.width === 0 || rect.height === 0) continue;

      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      // Skip sr-only
      if (
        el.classList.contains("sr-only") ||
        (style.position === "absolute" &&
          style.clip === "rect(0px, 0px, 0px, 0px)")
      )
        continue;

      // Skip elements not in the vertical viewport (offscreen above/below)
      if (rect.bottom < 0 || rect.top > window.innerHeight) continue;

      const exceedsRight = rect.right > vpWidth + TOLERANCE;
      const exceedsLeft = rect.left < -TOLERANCE;

      if (!exceedsRight && !exceedsLeft) continue;

      // Skip elements inside containers that clip or scroll horizontally —
      // those are caught by findHiddenOverflowViolations instead
      if (isInsideHorizontalClipOrScroll(el)) continue;

      violatingEls.push(el);
    }

    // Deduplicate: only report outermost violating ancestor
    const outermost = violatingEls.filter((el) => {
      let parent = el.parentElement;
      while (parent) {
        if (violatingEls.includes(parent)) return false;
        parent = parent.parentElement;
      }
      return true;
    });

    return outermost.map((el) => {
      const rect = el.getBoundingClientRect();
      const excessRight = Math.max(0, rect.right - vpWidth);
      const excessLeft = Math.max(0, -rect.left);
      return {
        selector: buildSelector(el),
        right: Math.round(rect.right),
        left: Math.round(rect.left),
        viewportWidth: vpWidth,
        excessPx: Math.round(Math.max(excessRight, excessLeft)),
      };
    });
  });
}

// ---------------------------------------------------------------------------
// 8. findClippedPositionedElements
//    Finds absolutely/fixed positioned elements whose bounding rect extends
//    beyond the bounding rect of the nearest ancestor with overflow clipping,
//    meaning the element is visually cut off. This catches badges, tooltips,
//    and indicators that poke out of their parent but get clipped.
//    Unlike findHiddenOverflowViolations (which checks scrollWidth), this
//    uses bounding rects to catch absolutely-positioned children that don't
//    affect scrollWidth at all.
// ---------------------------------------------------------------------------

export async function findClippedPositionedElements(
  page: Page,
  allowlist: readonly string[] = [],
): Promise<ClippedElementViolation[]> {
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
          try {
            if (el.matches(sel)) return true;
          } catch {
            /* invalid selector */
          }
        }
        return false;
      }

      /**
       * Walk up from el to find the nearest ancestor that clips overflow
       * (overflow-x or overflow-y is hidden, auto, or scroll).
       * Stops at <html>.
       */
      function findClipAncestor(el: Element): HTMLElement | null {
        let parent = el.parentElement;
        while (parent && parent !== document.documentElement) {
          const ps = getComputedStyle(parent);
          const ox = ps.overflowX;
          const oy = ps.overflowY;
          if (
            ox === "hidden" ||
            ox === "auto" ||
            ox === "scroll" ||
            oy === "hidden" ||
            oy === "auto" ||
            oy === "scroll"
          ) {
            return parent as HTMLElement;
          }
          parent = parent.parentElement;
        }
        return null;
      }

      const TOLERANCE = 1; // 1px rounding tolerance
      const violations: {
        childSelector: string;
        clipParentSelector: string;
        clippedPx: { top: number; right: number; bottom: number; left: number };
      }[] = [];

      const elements = document.querySelectorAll("*");
      for (const el of elements) {
        if (!(el instanceof HTMLElement)) continue;
        const style = getComputedStyle(el);

        // Only check positioned elements (absolute or fixed)
        if (style.position !== "absolute" && style.position !== "fixed")
          continue;
        // Skip invisible or sr-only
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (
          el.classList.contains("sr-only") ||
          style.clip === "rect(0px, 0px, 0px, 0px)"
        )
          continue;

        const rect = el.getBoundingClientRect();
        // Skip zero-size elements
        if (rect.width === 0 || rect.height === 0) continue;
        // Skip elements offscreen
        if (
          rect.bottom < 0 ||
          rect.top > window.innerHeight ||
          rect.right < 0 ||
          rect.left > window.innerWidth
        )
          continue;

        if (isAllowlisted(el)) continue;

        const clipAncestor = findClipAncestor(el);
        if (!clipAncestor) continue;

        const parentRect = clipAncestor.getBoundingClientRect();

        // Calculate how many pixels are clipped on each side
        const clippedTop = Math.max(0, parentRect.top - rect.top);
        const clippedRight = Math.max(0, rect.right - parentRect.right);
        const clippedBottom = Math.max(0, rect.bottom - parentRect.bottom);
        const clippedLeft = Math.max(0, parentRect.left - rect.left);

        const totalClipped =
          clippedTop + clippedRight + clippedBottom + clippedLeft;

        if (totalClipped <= TOLERANCE) continue;

        violations.push({
          childSelector: buildSelector(el),
          clipParentSelector: buildSelector(clipAncestor),
          clippedPx: {
            top: Math.round(clippedTop),
            right: Math.round(clippedRight),
            bottom: Math.round(clippedBottom),
            left: Math.round(clippedLeft),
          },
        });
      }

      return violations;
    },
    { allowlist: [...allowlist] },
  );
}

// ---------------------------------------------------------------------------
// 9. findLongTextOverflowViolations
//    Stress-tests text elements by temporarily injecting very long content
//    (with and without spaces) and checking for horizontal overflow.
//    Catches elements that lack word-break, overflow-wrap, or truncation
//    and would overflow their container with real long user content.
// ---------------------------------------------------------------------------

export type LongTextOverflowViolation = {
  /** Selector for the overflowing element */
  selector: string;
  /** Original text (truncated for readability) */
  originalText: string;
  /** Which test string caused the overflow: 'no-spaces' or 'long-words' */
  testType: "no-spaces" | "long-words";
  /** How many pixels the content exceeds the container */
  excessPx: number;
  /** The element's clientWidth at time of check */
  clientWidth: number;
  /** The element's scrollWidth at time of check */
  scrollWidth: number;
};

export async function findLongTextOverflowViolations(
  page: Page,
  /** CSS selector to scope the search (default: entire page) */
  scope = "body",
  /** Selectors for elements to skip (e.g. intentionally scrollable areas) */
  allowlist: readonly string[] = [],
): Promise<LongTextOverflowViolation[]> {
  return page.evaluate(
    ({ scope, allowlist }) => {
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
          try {
            if (el.matches(sel)) return true;
          } catch {
            /* invalid selector */
          }
        }
        let parent = el.parentElement;
        while (parent) {
          for (const sel of allowlist) {
            try {
              if (parent.matches(sel)) return true;
            } catch {
              /* invalid selector */
            }
          }
          parent = parent.parentElement;
        }
        return false;
      }

      const LONG_NO_SPACES =
        "Superlongwordwithoutanyspacesthatwilloverflowmostcontainersonmobiledevicesandshouldtriggertextbreaking";
      const LONG_WITH_SPACES =
        "This is a reasonably long sentence that contains multiple words and should wrap properly within its container but might overflow if the container is too narrow or lacks proper text wrapping styles applied to it";

      const container = document.querySelector(scope);
      if (!container) return [];

      // Find all visible text-bearing elements
      const textSelectors =
        "p, h1, h2, h3, h4, h5, h6, span, a, li, label, td, th, dt, dd";
      const elements = container.querySelectorAll(textSelectors);

      const violations: LongTextOverflowViolation[] = [];

      for (const el of elements) {
        if (!(el instanceof HTMLElement)) continue;

        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;

        // Skip zero-size or offscreen elements
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.top > window.innerHeight || rect.bottom < 0) continue;

        // Skip sr-only
        if (
          el.classList.contains("sr-only") ||
          (style.position === "absolute" &&
            style.clip === "rect(0px, 0px, 0px, 0px)")
        )
          continue;

        // Skip absolute/fixed positioned elements (badges, indicators, dots)
        if (style.position === "absolute" || style.position === "fixed")
          continue;

        // Skip allowlisted
        if (isAllowlisted(el)) continue;

        // Skip elements that already use truncation (they handle overflow)
        if (
          style.textOverflow === "ellipsis" ||
          el.classList.contains("truncate")
        )
          continue;

        // Skip elements inside line-clamp containers
        let inLineClamp = false;
        let p = el.parentElement;
        while (p) {
          if (
            p.className &&
            typeof p.className === "string" &&
            /line-clamp/.test(p.className)
          ) {
            inLineClamp = true;
            break;
          }
          p = p.parentElement;
        }
        if (inLineClamp) continue;

        // Skip elements inside buttons/interactive controls (labels, not content)
        let insideControl = false;
        let cp = el.parentElement;
        while (cp) {
          const tag = cp.tagName;
          if (tag === "BUTTON" || tag === "A") {
            const cpStyle = getComputedStyle(cp);
            // Skip if parent is a button-like link (inline-flex = button style)
            if (
              tag === "BUTTON" ||
              cpStyle.display === "inline-flex" ||
              cpStyle.display === "flex"
            ) {
              insideControl = true;
              break;
            }
          }
          cp = cp.parentElement;
        }
        if (insideControl) continue;

        // Skip purely inline elements (they flow within parent)
        if (style.display === "inline" && el.tagName !== "A") continue;

        // Skip very small elements (badges, timestamps, icons)
        if (rect.width < 60) continue;

        const originalHTML = el.innerHTML;
        const testCases: Array<{
          text: string;
          type: "no-spaces" | "long-words";
        }> = [
          { text: LONG_NO_SPACES, type: "no-spaces" },
          { text: LONG_WITH_SPACES, type: "long-words" },
        ];

        for (const testCase of testCases) {
          el.textContent = testCase.text;

          // Force layout recalc
          void el.offsetWidth;

          const excess = el.scrollWidth - el.clientWidth;
          if (excess > 1) {
            violations.push({
              selector: buildSelector(el),
              originalText: (originalHTML || "")
                .replace(/<[^>]*>/g, "")
                .slice(0, 40),
              testType: testCase.type,
              excessPx: Math.round(excess),
              clientWidth: el.clientWidth,
              scrollWidth: el.scrollWidth,
            });
            // Only report first failing test type per element
            el.innerHTML = originalHTML;
            break;
          }
        }

        // Restore original content
        el.innerHTML = originalHTML;
      }

      return violations;
    },
    { scope, allowlist: [...allowlist] },
  );
}

// ---------------------------------------------------------------------------
// 10. checkMinimumSpacing
//     Measures the vertical gap between two elements (bottom of A to top of B)
//     and asserts it meets a minimum pixel threshold. Catches tight/zero gaps
//     between header bars and page content, filter rows and card grids, etc.
// ---------------------------------------------------------------------------

export async function checkMinimumSpacing(
  page: Page,
  selectorA: string,
  selectorB: string,
  minGapPx: number,
): Promise<SpacingResult> {
  return page.evaluate(
    ({ selA, selB, minGap }) => {
      const elA = document.querySelector(selA);
      const elB = document.querySelector(selB);

      if (!elA || !elB) {
        return {
          tooTight: false,
          gapPx: 0,
          requiredPx: minGap,
          rectA: elA
            ? (() => {
                const r = elA.getBoundingClientRect();
                return { x: r.x, y: r.y, width: r.width, height: r.height };
              })()
            : null,
          rectB: elB
            ? (() => {
                const r = elB.getBoundingClientRect();
                return { x: r.x, y: r.y, width: r.width, height: r.height };
              })()
            : null,
        };
      }

      const a = elA.getBoundingClientRect();
      const b = elB.getBoundingClientRect();

      // Vertical gap: bottom of A to top of B
      const gap = b.top - a.bottom;

      return {
        tooTight: gap < minGap,
        gapPx: Math.round(gap * 10) / 10,
        requiredPx: minGap,
        rectA: { x: a.x, y: a.y, width: a.width, height: a.height },
        rectB: { x: b.x, y: b.y, width: b.width, height: b.height },
      };
    },
    { selA: selectorA, selB: selectorB, minGap: minGapPx },
  );
}
