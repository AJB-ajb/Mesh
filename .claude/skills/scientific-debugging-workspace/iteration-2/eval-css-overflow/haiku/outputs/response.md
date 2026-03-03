# CSS Border-Radius Not Rendering in DashboardLayout — Scientific Debugging Analysis

## Problem Statement

The Card component has `border-radius: 12px` defined in CSS, but corners appear completely square when rendered inside DashboardLayout. Two attempted fixes failed:

1. Adding `border-radius: 12px !important` — no effect
2. Adding inline `style={{ borderRadius: '12px' }}` — no effect

The Card renders with rounded corners correctly when used in isolation (not inside DashboardLayout).

## Diagnosis Process

### Confusions (What Doesn't Fit the Mental Model)

1. **border-radius is defined but invisible**: The CSS property exists in Card.css and should work
2. **!important didn't help**: This suggests it's not a specificity issue
3. **Inline styles didn't work**: Inline styles have the highest CSS specificity, so if they failed, this points away from specificity problems toward a structural/layout issue
4. **Context matters**: The component works in isolation but fails inside DashboardLayout — this is a critical clue

### Hypotheses

| Hypothesis                                         | Evidence                                                                                                                                                                                                                                                 | Likelihood     |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| **H1: Overflow clipping is masking border-radius** | Layout.css has `overflow: hidden` on `.content-area`. This creates an overflow context that clips child elements to the padding box. Combined with the flex layout, this could clip the Card's rounded corners. Works in isolation (no parent overflow). | **HIGH** ✓     |
| H2: Flex container is constraining Card dimensions | The layout uses `display: flex` which could constrain the Card. But flex alone shouldn't cause border-radius to disappear.                                                                                                                               | LOWER          |
| H3: CSS specificity issue with multiple selectors  | Already ruled out — `!important` didn't work, and inline styles should always win.                                                                                                                                                                       | **VERY LOW** ✗ |

### The Root Cause

**The `.content-area` element has `overflow: hidden`, which creates a new block formatting context.** When overflow is set to anything other than `visible`, the browser clips content to the padding box of that element. This clipping happens at the border box level, effectively masking any border-radius that extends to the edges of child elements.

This is a well-known CSS behavior: overflow clipping takes precedence over border-radius rendering at the visual level.

### Why Previous Fixes Failed

1. **`border-radius: 12px !important`** — This increases specificity of the border-radius property itself, but doesn't address the parent's overflow clipping. The property is applied; it's just visually clipped.

2. **Inline `borderRadius` style** — Same issue. The inline style sets the property correctly, but the parent's `overflow: hidden` clips it at render time.

### Why It Works in Isolation

When the Card is rendered outside DashboardLayout, there is no parent element with `overflow: hidden`, so the border-radius renders normally.

## The Fix

Change `.content-area` in Layout.css from:

```css
overflow: hidden; /* prevents content from causing horizontal scroll */
```

To:

```css
overflow-y: auto;
overflow-x: hidden;
```

Or alternatively:

```css
overflow: auto;
```

**Explanation**:

- `overflow-y: auto` allows vertical scrolling if content overflows vertically
- `overflow-x: hidden` still prevents horizontal scrolling as intended
- Together, they achieve the original goal (prevent horizontal scroll) while allowing rounded corners to render fully

The `overflow-x: hidden; overflow-y: auto` approach maintains the intent of the original code while avoiding the complete border-radius clipping that `overflow: hidden` causes.

## Verification

After applying this fix:

1. The Card should render with visible rounded corners inside DashboardLayout
2. Horizontal scrolling should still be prevented
3. Vertical scrolling will be available if content exceeds viewport height

## Key Takeaway

This is a classic CSS edge case where **layout properties (overflow) interfere with visual properties (border-radius) at the rendering level**. The fix required understanding the parent-child relationship and how overflow affects the stacking context, not modifying the property that appeared problematic (border-radius itself).
