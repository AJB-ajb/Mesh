# Scientific Debugging: Card Border-Radius Not Rendering in DashboardLayout

## Diagnosis Mode

Two fix attempts have already failed:

1. Adding `border-radius: 12px !important` to `.card` -- still square.
2. Adding `border-radius` as an inline style on the Card component -- still square.

Both fixes targeted the Card's own styles. Since neither worked, and since the Card renders correctly in isolation, the problem is not with the Card's CSS. Something in the parent layout is overriding or clipping the visual rendering.

---

## Step 1: Confusions

- **`!important` and inline styles had no effect.** This rules out CSS specificity or cascade issues entirely. The `border-radius` property IS being applied to the element; it is just not visually rendering.
- **Works in isolation, fails inside DashboardLayout.** The only difference is the parent context provided by `DashboardLayout`, specifically the `.content-area` wrapper around the cards.

---

## Step 2: Hypotheses

| #   | Hypothesis                                                                                     | Supporting Evidence                                                                                                                                                                                                                     | Contradicting Evidence                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `overflow: hidden` on `.content-area` is clipping the Card's rounded corners and box-shadow.   | `.content-area` has `overflow: hidden` (Layout.css:16). This creates a rectangular clip region. Card works fine in isolation (no `overflow: hidden` parent). `overflow: hidden` is a well-known cause of border-radius visual clipping. | The cards have 24px padding inset from the parent edges, so they are not flush with the clipping boundary.                                                    |
| 2   | Another CSS rule elsewhere is overriding `border-radius` on `.card`.                           | Would explain square corners.                                                                                                                                                                                                           | Already tried `!important` and inline styles -- both failed. The user confirmed isolation rendering works. No other CSS files are loaded that target `.card`. |
| 3   | The Card's white background blends with the parent's background, making corners appear square. | If both backgrounds are the same color, rounding would be invisible.                                                                                                                                                                    | The Card has `box-shadow` which would still show the curve visually even with same-color backgrounds.                                                         |

**Hypothesis 1 is the strongest.** Hypothesis 2 is effectively ruled out by the failed fix attempts. Hypothesis 3 is ruled out by the presence of `box-shadow`.

---

## Step 3: Testing the Hypothesis

The smallest distinguishing experiment: examine what `.content-area` contributes. From Layout.css:

```css
.content-area {
  flex: 1;
  padding: 24px;
  overflow: hidden; /* prevents content from causing horizontal scroll */
}
```

The `overflow: hidden` property creates a **Block Formatting Context** with a rectangular clipping region. This clips ALL overflow from child elements -- including the portions of `box-shadow` and visually rounded corners that paint outside the element's border-box boundaries.

The mechanism:

1. `.card` has `border-radius: 12px` and `box-shadow: 0 2px 8px rgba(0,0,0,0.1)`.
2. The box-shadow extends beyond the card's border-box (by up to 8px on each side, 10px on bottom).
3. `.content-area` has `overflow: hidden`, which clips child painting at its own rectangular (sharp-cornered) boundary.
4. When the shadow is clipped, the visual cue that makes the rounded corners apparent (the shadow curving around the corner) is lost or distorted, making corners appear square.
5. Additionally, `overflow: hidden` can interfere with the sub-pixel anti-aliasing that browsers use to render `border-radius` curves when a new stacking context is created.

**Confirmation:** The comment on the property -- `/* prevents content from causing horizontal scroll */` -- reveals the developer's intent was only to prevent **horizontal** overflow, but `overflow: hidden` clips **both axes**.

---

## Step 4: The Fix

**Root cause:** `overflow: hidden` on `.content-area` clips both horizontal and vertical overflow, which interferes with the visual rendering of child elements' `border-radius` and `box-shadow`.

**Fix:** Replace `overflow: hidden` with `overflow-x: hidden` to only clip horizontal overflow (matching the original intent from the comment) while leaving vertical painting unaffected.

### Layout.css -- before:

```css
.content-area {
  flex: 1;
  padding: 24px;
  overflow: hidden; /* prevents content from causing horizontal scroll */
}
```

### Layout.css -- after:

```css
.content-area {
  flex: 1;
  padding: 24px;
  overflow-x: hidden; /* prevents content from causing horizontal scroll */
}
```

This single-property change:

- Preserves the original intent (no horizontal scrollbar from overflowing content).
- Stops clipping vertical overflow, so `box-shadow` and `border-radius` on child Cards render correctly.
- Explains why both previous fix attempts failed: they targeted the Card's own styles, but the problem was the parent's clipping behavior. No amount of specificity (`!important`, inline styles) can override a parent's `overflow` clipping.
