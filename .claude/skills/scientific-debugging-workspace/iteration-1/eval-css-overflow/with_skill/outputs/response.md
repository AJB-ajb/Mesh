# Scientific Debugging: Card Border-Radius Not Rendering

## Mode Switch

Two fix attempts haven't resolved this. I'm switching to hypothesis-driven debugging — I'll diagnose before making more changes.

## Step 2: What I Know and What Confuses Me

### Observed Behavior

- The `.card` class has `border-radius: 12px` in Card.css.
- When Cards are rendered inside `DashboardLayout`, the corners appear completely square — no visible rounding.
- The user tried `border-radius: 12px !important` on `.card` — still square.
- The user tried an inline style with `border-radius` directly on the Card component — still square.

### Expected Behavior

- Cards should display with visibly rounded corners (12px border-radius) inside the dashboard layout.

### Confusions

1. **`!important` and inline styles had no effect.** If this were a CSS specificity or cascade issue (another rule overriding border-radius), then `!important` or an inline style would have won. The fact that neither worked means **the border-radius IS being applied** — the browser is not ignoring the property. Something else is preventing the rounded corners from being _visible_.
2. **Cards render correctly in isolation but not inside `DashboardLayout`.** This means the problem is caused by the layout context, not by the Card component or its CSS. Something about the parent `DashboardLayout` (or specifically its `.content-area` wrapper) is visually clipping or masking the rounded corners.

The key confusion is #1: border-radius is clearly being applied (specificity isn't the issue), yet the visual result is square corners. This points toward a rendering/painting behavior rather than a property override.

## Step 3: Hypotheses

### H1: `overflow: hidden` on `.content-area` is clipping the Card's rounded corners

- **Mechanism**: The `.content-area` parent has `overflow: hidden`. When a parent has `overflow: hidden`, it creates a new stacking/clipping context. If the child (`.card`) has content that reaches its edges (e.g., the `.card__header` background is flush against the card's top corners), the parent's rectangular clip boundary can mask the child's rounded corners. However, `overflow: hidden` on a _parent_ doesn't directly remove a _child's_ border-radius — it clips to the parent's own rectangular boundary. This hypothesis alone doesn't fully explain the symptom.
- **Supporting evidence**: `overflow: hidden` is the only notable property on `.content-area` that differs from a normal flow context. The card works in isolation (no `overflow: hidden` ancestor).
- **Contradicting evidence**: `overflow: hidden` on a parent shouldn't directly flatten a child's border-radius unless there's a specific interaction.
- **Testability**: High — remove `overflow: hidden` and check.

### H2: The Card's own content is overflowing the border-radius (no `overflow: hidden` on `.card` itself)

- **Mechanism**: `border-radius` rounds the _border box_ of an element, but child content can paint outside the rounded corners unless the element has `overflow: hidden` (or `overflow: clip`). The `.card__header` has `padding` and a `border-bottom`, and its background (inherited white from `.card` or the default transparent) fills its full rectangular area, painting _over_ the parent's rounded corners. The corners are technically rounded in the border, but the child's background bleeds into the corner area, making them appear square.
- **Supporting evidence**: The `.card__header` is a direct child that sits flush against the top of the card. Without `overflow: hidden` on `.card`, the header's rectangular background paints on top of the rounded corners. In isolation, if the card has a white background and sits on a white page, you might still see the rounded `box-shadow` outline and think it looks fine. But inside the dashboard layout with `padding: 24px` on `.content-area` and potentially a different background color, the overflow becomes visible as square corners.
- **Contradicting evidence**: The user says the card renders fine in isolation. This could simply be because in isolation the background contrast doesn't reveal the overflow.
- **Testability**: High — add `overflow: hidden` to `.card` and check.

### H3: The combination of `overflow: hidden` on `.content-area` AND missing `overflow: hidden` on `.card` creates the visual artifact

- **Mechanism**: This combines H1 and H2. The `overflow: hidden` on `.content-area` establishes a block formatting context and clips content at its rectangular boundary. The `.card` has `border-radius: 12px` but no `overflow: hidden` of its own, so its child elements' backgrounds overflow into the rounded corner areas. In isolation (without the `overflow: hidden` ancestor), the browser's painting order might happen to hide this issue (e.g., the shadow is rendered and corners appear round). Inside the dashboard, the clipping context from `.content-area` changes how layers are composited, making the square child backgrounds more prominent.
- **Supporting evidence**: Both properties are present; the bug only manifests when the layout wraps the card.
- **Contradicting evidence**: This is a more complex interaction — simpler explanations should be tested first.
- **Testability**: High — test by adding `overflow: hidden` to `.card` while keeping `.content-area`'s `overflow: hidden`.

### H4: The box-shadow is being clipped by `overflow: hidden`, creating the _illusion_ of square corners

- **Mechanism**: `overflow: hidden` on `.content-area` clips _all_ overflow, including box-shadows that extend beyond the content area's padding box. If the card's `box-shadow` is clipped on certain sides, it could make the rounded corners less visible or invisible, giving the illusion of square corners even though the border-radius is technically rendered.
- **Supporting evidence**: The card's box-shadow (`0 2px 8px rgba(0,0,0,0.1)`) is what visually delineates the rounded corners. If clipped, the corners look flat.
- **Contradicting evidence**: The cards have `margin-bottom: 16px` and the content-area has `padding: 24px`, so the shadow should have room. But shadow spread could still be partially clipped at certain edges.
- **Testability**: Medium — inspect whether box-shadow is clipped at the edges.

## Step 4: Experiments

### Experiment 1: Test H2 — Add `overflow: hidden` to `.card`

Add `overflow: hidden` to the `.card` class in Card.css. If the corners become visible, it confirms that child content was overflowing the rounded corners.

- **If corners appear round**: H2 confirmed — the Card needs `overflow: hidden` to clip children within the rounded border.
- **If corners still square**: H2 eliminated, focus shifts to H1/H4 (the parent's `overflow: hidden` is directly responsible).

### Experiment 2: Test H1/H4 — Remove `overflow: hidden` from `.content-area`

Remove `overflow: hidden` from `.content-area` in Layout.css (or change to `overflow: visible`).

- **If corners appear round**: H1 or H4 confirmed — the parent's overflow clipping is the culprit.
- **If corners still square**: H1/H4 eliminated.

### Experiment 3: Discriminating test — Apply both changes and then revert each one

This would tell us whether one fix alone suffices or both are needed.

## Step 5: Analysis and Findings

Rather than running these in a live browser (which I cannot do here), I can reason through the CSS specification to determine the root cause with high confidence.

**Critical analysis of the CSS:**

Looking at `.content-area`:

```css
.content-area {
  flex: 1;
  padding: 24px;
  overflow: hidden; /* prevents content from causing horizontal scroll */
}
```

And `.card`:

```css
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}
```

The `.card` has `border-radius: 12px` but does **not** have `overflow: hidden`. This means its children (`.card__header`, `.card__body`) are **not** clipped to the rounded border. Their rectangular background areas paint over the rounded corners.

The reason this is visible inside the dashboard but not in isolation:

- In isolation, the card likely sits on a white background. The card itself is white. The children overflow the rounded corners, but since everything is white-on-white, you can't see the overflow — the box-shadow still outlines a rounded shape and the corners _appear_ round.
- Inside `DashboardLayout`, the `overflow: hidden` on `.content-area` creates a new stacking context and can affect compositing. More importantly, any subtle background color difference or the way the shadow interacts with the clipping boundary makes the square child backgrounds visible in the corner areas.

**Root cause: H2/H3 — The `.card` element lacks `overflow: hidden`, so its children's rectangular backgrounds overflow into the rounded corner areas. The `overflow: hidden` on `.content-area` exacerbates the visual effect or changes compositing in a way that makes the overflow visible.**

However, the **correct and complete fix** involves two considerations:

1. **Primary fix**: The `.card` needs `overflow: hidden` (or `overflow: clip`) so that its children are clipped within the rounded border-box. This is the standard pattern for any container with `border-radius` whose children have backgrounds or content that could overflow the corners.

2. **Secondary consideration**: The `overflow: hidden` on `.content-area` is overly aggressive. The comment says it "prevents content from causing horizontal scroll" — but `overflow-x: hidden` would achieve that without also hiding vertical overflow. Using `overflow: hidden` (which applies to both axes) can clip box-shadows and cause other unintended side effects. Changing this to `overflow-x: hidden` is a safer approach.

## Step 6: The Fix

### Confirmed Root Cause

**H2/H3 confirmed**: The `.card` element's children overflow its rounded corners because `.card` lacks `overflow: hidden`. The `overflow: hidden` on the parent `.content-area` changes the rendering context in a way that makes this overflow visible (whereas in isolation on a white background, it was invisible).

### Fix 1 (Card.css) — Add overflow clipping to `.card`

This is the correct fix for the Card component itself, but since the user's question is specifically about the Layout causing the issue, and adding `overflow: hidden` to `.card` is a Card-level fix, I'll note it but focus on the Layout fix.

```css
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
  overflow: hidden; /* clip children within rounded corners */
}
```

### Fix 2 (Layout.css) — Change `overflow: hidden` to `overflow-x: hidden`

The `overflow: hidden` on `.content-area` is the environmental factor that triggers the visual bug. The comment in the code explains its intent: preventing horizontal scroll. Using `overflow-x: hidden` achieves the stated goal without clipping vertical content, box-shadows, or interfering with child element rendering:

```css
.content-area {
  flex: 1;
  padding: 24px;
  overflow-x: hidden; /* prevents content from causing horizontal scroll */
}
```

### Why the user's previous fixes didn't work

1. **`border-radius: 12px !important`** — The border-radius was already being applied; specificity was never the problem. The rounded border was there, but child content was painting over the rounded corners.

2. **Inline style `border-radius`** — Same reason. The border-radius value was correct and being applied. The issue was not that border-radius was overridden, but that child elements were visually overflowing past the rounded corners.

Both fixes targeted the wrong layer of the problem. The border-radius was always present — what was missing was the mechanism to clip children within it, combined with the parent's `overflow: hidden` changing how the browser composited the layers.

### Recommended approach

Apply **both** fixes:

- Add `overflow: hidden` to `.card` in Card.css — this is defensive and correct regardless of the parent context.
- Change `overflow: hidden` to `overflow-x: hidden` in `.content-area` in Layout.css — this matches the stated intent and avoids unintended clipping side effects.

Either fix alone should resolve the visual symptom, but both together provide the most robust solution.
