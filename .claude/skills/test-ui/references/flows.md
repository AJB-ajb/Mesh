# Flow Patterns

Generic flow patterns to apply during testing. These are **patterns**, not scripts — adapt them to whatever the app offers. Not all patterns apply to every app.

Take a screenshot after each "Verify" step. Track any created entity IDs for cleanup.

---

## Authentication

**Why first**: If login is broken, nothing else works.

1. Login form renders with expected inputs
2. Valid credentials → redirected to authenticated page
3. Session persists across page reload
4. Sign out → session clears, protected routes redirect to login
5. OAuth/SSO buttons render and are clickable (if present)

---

## Core Create Flow

**Why critical**: The primary "create" action is usually the app's reason to exist.

1. Find the creation entry point (button, FAB, nav item, etc.)
2. Fill required fields with `[TEST]`-prefixed data
3. Submit
4. Verify: created entity appears (redirect to detail, success toast, etc.)
5. Record the entity ID for cleanup
6. Friction check: Was it obvious what was required? Was success clear?

---

## Discovery / Browse

**Why critical**: Users need to find what others have created.

1. Navigate to the main browse/discovery page
2. Content renders (cards, list, grid)
3. Search: type a query, results update
4. Filters: use available filter controls, content filters correctly
5. Clear filters: reset works
6. Friction check: Is search responsive? Are filters intuitive? "No results" handled?

---

## Detail / Interaction

**Why important**: Where users engage with content and each other.

1. Open an entity detail page
2. Content displays correctly
3. Owner vs. visitor: different actions available?
4. Multi-user interaction: User 2 takes an action via API → User 1 sees the result in browser
5. Friction check: Are available actions clear? Is it obvious what happened?

---

## Navigation

**Why important**: Broken nav makes features unreachable.

1. Identify all nav items (sidebar, header, bottom bar)
2. Click each — URL changes, page loads
3. Mobile: nav adapts, hamburger/bottom bar works
4. Friction check: Confusing, redundant, or hard-to-find items?

---

## Profile / Settings

**Why important**: Tests form state, persistence, and data round-tripping.

1. Navigate to profile/settings
2. Record current value of a field
3. Edit, save, verify persistence (reload page)
4. Revert to original
5. Friction check: Was edit/save obvious? Confirmation clear?

---

## Multi-User Interaction

**Why important**: Most apps with social features have complex multi-user state.

1. User 2 acts via API (sends request, creates content, etc.)
2. User 1's browser: verify the action is reflected (notification, updated state, new item)
3. User 1 responds (accept, reply, etc.)
4. Verify: both sides see the correct final state
5. Friction check: Was it clear something happened? Was responding intuitive?
