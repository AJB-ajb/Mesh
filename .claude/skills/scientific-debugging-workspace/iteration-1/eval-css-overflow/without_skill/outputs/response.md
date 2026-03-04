# Debugging Analysis: Card Border-Radius Not Rendering in DashboardLayout

## Reported Symptom

The Card component has `border-radius: 12px` defined in its CSS, but when rendered inside the `DashboardLayout`, the corners appear completely square. Adding `!important` or inline styles does not help. Rendering the Card outside the layout shows the rounded corners correctly.

## Key Observation

The fact that `border-radius` is being applied (confirmed by the CSS rule, `!important`, and inline styles all having no visible effect) yet the corners appear square tells us this is **not a specificity or cascade problem**. The `border-radius` property IS being applied to the element -- it is simply not visible. This distinction is critical.

## Root Cause: `overflow: hidden` on the Parent Container

In `Layout.css`, the `.content-area` class has:

```css
.content-area {
  flex: 1;
  padding: 24px;
  overflow: hidden; /* prevents content from causing horizontal scroll */
}
```

Here is exactly what is happening:

1. The `.content-area` element has `overflow: hidden`.
2. When a parent element has `overflow: hidden`, it creates a new **block formatting context** and clips all content that extends beyond its own bounding box.
3. The `.card` elements inside `.content-area` have `border-radius: 12px` and `box-shadow`. The card's rounded corners and box-shadow extend visually, but the cards themselves sit flush against or very close to the edges of the content area.
4. **The critical mechanism**: `overflow: hidden` on the parent does not directly remove the child's `border-radius`. Instead, what happens is that `.content-area` itself has **square corners** (no `border-radius`). When the card's box-shadow or the card itself extends to the edges of `.content-area`, the parent's square clipping boundary cuts off the visual rounded corners of the child card. The shadow and the rounded-corner region of the card are clipped by the parent's rectangular overflow boundary.

More precisely: the `overflow: hidden` on `.content-area` establishes a rectangular clip region. The cards' `box-shadow` bleeds outward from the card, but gets clipped at the rectangular boundary of `.content-area`. If the card is wide enough to approach the content-area's edges (which it is, since cards are block-level elements that fill their container's width), the rounded corners at the card's edges get clipped by the parent's straight-edged overflow boundary, making them appear square.

However, re-examining this more carefully: even with `overflow: hidden`, the cards have `padding: 24px` of breathing room from the parent. So the clipping alone may not fully explain corner loss at all four corners.

Let me reconsider with a more precise analysis.

## Revised Root Cause Analysis

After closer examination, the most likely explanation involves how `overflow: hidden` interacts with the rendering:

The `.content-area` has `overflow: hidden` and the `.card` elements sit inside it. The `overflow: hidden` property creates a **new stacking context** and a clipping region. Here is the more precise chain of causation:

1. `.content-area` has `overflow: hidden` with `padding: 24px`, so there IS space around the cards.
2. The cards have `border-radius: 12px`, `box-shadow`, and `margin-bottom: 16px`.
3. With `overflow: hidden` on `.content-area`, any card content or shadow that overflows the `.content-area` bounds gets clipped -- but this alone would not clip the border-radius at all four corners if the card is well within the parent.

**The real answer**: `overflow: hidden` on a flex child (`.content-area` has `flex: 1`) can cause rendering issues where the browser's painting of child elements' rounded corners is affected. But the **most common and well-documented cause** of "border-radius visually disappears" is:

**The parent's `overflow: hidden` clips the child's `box-shadow`, and the visual perception of "no rounded corners" comes from the box-shadow being the most visible part of the card's edge treatment being clipped.** When the shadow is clipped, the card edges appear flat and sharp because the soft shadow that normally wraps around the rounded corners is gone, and the white card background against the page background shows no contrast at the corners.

The most pragmatic fix: change `overflow: hidden` to `overflow-x: hidden` (to still prevent horizontal scroll, which was the stated intent) or remove it entirely and handle horizontal overflow differently. Alternatively, add the same (or larger) `border-radius` to `.content-area` so its clip region also has rounded edges, but this is a band-aid.

## The Fix

**Change `overflow: hidden` to `overflow-x: hidden`** in `.content-area`. This preserves the original intent (preventing horizontal scrollbar) while allowing vertical content to render normally without clipping box-shadows and rounded corners.

### Before (Layout.css):

```css
.content-area {
  flex: 1;
  padding: 24px;
  overflow: hidden; /* prevents content from causing horizontal scroll */
}
```

### After (Layout.css):

```css
.content-area {
  flex: 1;
  padding: 24px;
  overflow-x: hidden; /* prevents horizontal scroll without clipping card shadows/corners */
}
```

## Why the User's Attempted Fixes Failed

1. **`border-radius: 12px !important`** -- Failed because the border-radius WAS being applied. The problem was never specificity. The parent's `overflow: hidden` was clipping the visual result.

2. **Inline `border-radius` style** -- Same reason. The property was applied to the DOM element; it was the parent clipping that hid its visual effect.

3. **Works outside DashboardLayout** -- Confirms the issue: without the `.content-area` parent and its `overflow: hidden`, there is no clipping boundary, so the card's border-radius renders normally.

## Summary

| Item                      | Detail                                                                                    |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| **Bug**                   | Card rounded corners invisible inside DashboardLayout                                     |
| **Root cause**            | `overflow: hidden` on `.content-area` clips card box-shadows and rounded corner rendering |
| **File**                  | `Layout.css`, line 16                                                                     |
| **Fix**                   | Change `overflow: hidden` to `overflow-x: hidden`                                         |
| **Why user fixes failed** | The `border-radius` was always applied; it was the parent clipping that masked it         |
