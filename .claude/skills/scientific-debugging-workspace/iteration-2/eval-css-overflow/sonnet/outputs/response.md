# Scientific Debugging: Card Border-Radius Not Rendering

Switching to diagnosis mode. Two fixes have already failed (`border-radius: 12px !important` on `.card`, and an inline style directly on the Card element). Both changes targeted the Card itself — yet the problem only appears inside `DashboardLayout`. This means the Card is almost certainly rendering the border-radius correctly; something in the layout is clipping it before it reaches the screen.

---

## Step 1 — Note Confusions

- `border-radius: 12px !important` on an element should win any specificity battle. An inline style on the element itself is the highest-specificity rule possible. Neither worked. This rules out any CSS specificity or override issue on the Card.
- The Card renders correctly in isolation. The problem appears only inside `DashboardLayout`. The layout is therefore the only variable that changed between working and broken states.
- The card visually appears "square" — it isn't that the radius value is wrong, the rounded corners are being clipped entirely.

The confusion that points at a wrong assumption: both attempted fixes were applied to the Card element. But if a parent is clipping the Card's painted output, changing the Card's own styles will never help.

---

## Step 2 — Hypotheses

**H1 (most likely): `overflow: hidden` on `.content-area` is clipping the Card's border-radius.**

Supporting evidence:

- Layout.css line 15: `.content-area { overflow: hidden; }` with the comment "prevents content from causing horizontal scroll."
- `overflow: hidden` on a parent clips all painted output of descendants — including the anti-aliased rounded corners of a child's `border-radius`. This is a well-known CSS interaction.
- The Card works in isolation (no `.content-area` wrapper), confirming the parent is the cause.
- Neither fix on the Card itself changed anything — consistent with the problem living entirely in the parent.

Testable: remove or change `overflow: hidden` on `.content-area` and observe whether rounded corners appear.

**H2 (less likely): A `transform` or `filter` on an ancestor is creating a new stacking context that clips the border-radius.**

Supporting evidence: none visible in the provided files.
Contradicting evidence: no `transform`, `filter`, `clip-path`, or `will-change` properties appear anywhere in Layout.css or Card.css.

**H3 (least likely): A global CSS reset or third-party stylesheet is zeroing out border-radius.**

Supporting evidence: none in the provided files.
Contradicting evidence: `border-radius: 12px !important` and an inline style were both tried and both failed — a global reset would be overridden by `!important`. If a reset were the cause, at least one of those two fixes would have worked.

---

## Step 3 — Diagnostic Test

The experiment that distinguishes H1 from H2/H3 in one step:

In browser DevTools, select the `.content-area` element and toggle `overflow: hidden` off. If the Card's corners immediately become rounded, H1 is confirmed. If corners remain square, look for transforms or filters higher in the tree.

Expected result: H1 is confirmed — corners appear as soon as `overflow: hidden` is removed from `.content-area`.

---

## Step 4 — Root Cause and Fix

**Root cause confirmed by H1:** `.content-area` has `overflow: hidden`, which clips the painted border-radius of every descendant Card.

The original intent of `overflow: hidden` was only to suppress horizontal scroll. The correct fix is to replace it with `overflow-x: hidden`, which achieves the scroll-prevention goal without clipping the vertical or painted output of child elements.

No changes to Card.tsx, Card.css, or DashboardPage.tsx are needed.

---

## Fixed Layout.css

The single change: line 15, `.content-area`: `overflow: hidden` → `overflow-x: hidden`.
