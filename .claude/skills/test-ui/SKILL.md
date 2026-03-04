---
name: test-ui
description: "Browser-based UI testing for Mesh. Runs user-flow tests, visual/responsive checks, and multi-user scenarios against the dev server, producing structured bug reports. Use whenever someone says 'test the UI', 'run browser tests', 'QA the app', 'check the pages', 'visual regression', 'test mobile layout', 'run flow tests', or 'test the posting flow'."
argument-hint: "[flows|visual|full] [mobile|desktop] [route-or-flow-name]"
---

# Browser UI Testing Skill

## 1. Mode Selection

Parse `$ARGUMENTS` along three dimensions:

| Dimension    | Values                                                       | Default           |
| ------------ | ------------------------------------------------------------ | ----------------- |
| **Scope**    | `flows`, `visual`, `full`                                    | `full` (run both) |
| **Viewport** | `mobile`, `desktop`                                          | both              |
| **Target**   | route path or flow name (e.g. `/discover`, `authentication`) | all               |

Examples:

- `flows mobile` — flow tests at mobile viewport only
- `visual /profile` — visual tests on the profile page only
- `full desktop connections` — all tests, desktop only, focused on connections flow/page
- (empty) — full test suite, both viewports, all pages and flows

## 2. Prerequisites

Before starting, verify each of these. If any fails, report it and stop.

1. **Dev server running** at `http://localhost:3000` — navigate and confirm the page loads.
   _Why_: All tests run against the local dev instance; without it nothing works.
   **Caveat**: Slash commands (`/commands`) only work against a production build (`pnpm build && pnpm start`), not the dev server (`pnpm dev`). If testing slash command features, use a production build.

2. **Browser automation available** — Claude-in-Chrome MCP tools respond.
   _Why_: The skill drives the browser programmatically via MCP.

3. **Test password available** — `.env` contains `TEST_USER_PASSWORD`.
   _Why_: Both test accounts share this password for login.

```
Grep pattern="TEST_USER_PASSWORD" path=".env"
```

## 3. Setup

1. Call `tabs_context_mcp` to get browser context.
2. Create a new tab with `tabs_create_mcp`.
3. Read `TEST_USER_PASSWORD` from `.env`.
4. Initialize a **test-data tracking list** — an in-memory list to record IDs of any entities created during testing (posting IDs, bookmarks, connection requests, etc.). This list drives the cleanup phase at the end.
   _Why_: The dev database is disposable, so we exercise full CRUD, but we clean up after ourselves to leave the database in a known state.
5. Store credentials for both test users:
   - **User 1** (primary/UI): `ajb60721@gmail.com`
   - **User 2** (secondary/API): `ajb60722@gmail.com`
   - Password for both: value from `.env`

## 4. Dynamic Route Discovery

Instead of a hardcoded page list, discover routes at test time:

```
Glob pattern="src/app/**/page.tsx"
```

Parse the Next.js App Router directory structure to build a route table. The `(group)` directories are route groups that don't appear in the URL. For example, `src/app/(dashboard)/discover/page.tsx` maps to `/discover`.

Read `references/pages.md` (in this skill directory) for guidance on interpreting the directory layout, which route groups exist, and what to look for on each type of page.

_Why_: Routes change as the app evolves. Dynamic discovery ensures the skill always tests the actual current routes rather than a stale list.

## 5. Login Helper

Use this procedure whenever authentication is needed for a given user.

1. Navigate to `http://localhost:3000/login`
2. Wait for the page to load (take screenshot to verify)
3. Find the email input, enter the user's email
4. Find the password input, enter the password from `.env`
5. Click the "Sign In" button
6. Wait for redirect — take screenshot and note the actual post-login URL (do not assume a specific route)
7. Verify the page content loads (not a blank page or error)

**Skip if already authenticated**: Before logging in, check if the current page shows the authenticated app shell (sidebar, header). If so, verify the correct user is logged in and skip the login flow.

If login fails, report it as a critical bug and stop.

### Switching Users

To switch from User 1 to User 2 (or vice versa):

1. Sign out via the avatar dropdown → "Sign out"
2. Run the login helper with the other user's email

## 6. Multi-User Testing

Many features require two users interacting. The test skill uses a split approach:

- **User 1** (primary) interacts through the browser UI as normal
- **User 2** (secondary) actions are simulated via authenticated API calls

### User 2 API Pattern

Use `javascript_tool` to make fetch calls against the app's API routes with User 2's auth session:

1. **Obtain User 2's session**: Log in as User 2 via the browser, extract the auth cookies/token, then switch back to User 1.
2. **Make API calls**: Use `javascript_tool` with `fetch()` against `localhost:3000/api/...` routes, passing User 2's auth credentials.

Read `spec/testing.md` for the full list of multi-user scenarios. Key patterns:

- User 1 creates posting → User 2 requests to join → User 1 accepts → conversation opens
- User 1 sends connection request → User 2 accepts
- Sequential invite: User 1 creates posting → selects User 2 → User 2 responds

_Why_: Real usage involves multiple users. Testing only single-user flows misses interaction bugs like notification delivery, permission checks, and state transitions between users.

## 7. Flow Tests

**When scope is `flows` or `full`.**

Read `references/flows.md` (in this skill directory) for the 10 flow test scripts. Execute each flow in order:

1. **Authentication** — login, OAuth buttons visible, redirect
2. **Navigation** — discover routes dynamically, verify sidebar/header/mobile nav
3. **Create Posting** — actually submit via CodeMirror editor, track posting ID
4. **Browse & Filter** — search, category chips, bookmark toggle
5. **Posting Detail** — owner view (edit/manage), visitor view (apply)
6. **Posts Page** — filter chips, verify test posting appears
7. **Connections** — view list, split-pane chat
8. **Profile** — edit a field, save, undo the edit
9. **Settings** — toggle a preference, undo the toggle
10. **Sign Out** — sign out, verify session cleared

Multi-user steps are woven into the flows:

- Flow 5: User 2 requests to join User 1's test posting (via API)
- Flow 7: User 2 sends connection request to User 1 (via API)

For each flow:

- Follow the steps in `references/flows.md`
- Take screenshots at key verification points
- Record result as PASS or FAIL
- If FAIL, record a bug with full details (see report template)
- If **target** was specified, only run the matching flow

## 8. Visual Tests

**When scope is `visual` or `full`.**

### Page Discovery

Use the route table from step 4 (dynamic route discovery). For each discovered page:

1. Navigate to the page (log in first if it's a protected route)
2. **Desktop check** (skip if viewport is `mobile` only) — resize to 1440×900, take screenshot, apply the 10-point visual checklist
3. **Mobile check** (skip if viewport is `desktop` only) — resize to 375×812, take screenshot, apply the 10-point visual checklist
4. Record any issues found as bugs

_Why both viewports_: Mesh is a PWA targeting both desktop and mobile users. Responsive breakpoints frequently cause layout regressions that only show at specific widths.

If **target** was specified, only test the matching page.

### 10-Point Visual Checklist

For each page/viewport, check:

1. **Layout integrity** — no content overflow, no overlapping elements, no horizontal scroll
2. **Typography** — readable font sizes (min 14px body), proper heading hierarchy
3. **Spacing** — consistent padding/margins, no cramped or overly spaced elements
4. **Interactive elements** — buttons/links adequately sized (min 44px touch target on mobile), visible focus states
5. **Responsive behavior** — sidebar collapses on mobile, content reflows properly, no cut-off text
6. **Color & contrast** — text readable against background, theme toggle works if present
7. **Empty states** — appropriate messages shown when no data, not blank/broken
8. **Loading states** — spinner or skeleton shown during data fetch, not blank
9. **Broken images/icons** — all images load, icons render correctly
10. **Accessibility basics** — landmarks present, form labels exist, images have alt text

## 9. Stateful Testing Guidelines

The dev database is disposable — exercise full CRUD operations.

- **Prefix test data** with `[TEST]` in titles/descriptions so it's identifiable
- **Track all created entity IDs** in the test-data tracking list (initialized in setup)
- **Types to track**: posting IDs, bookmark IDs, connection request IDs, profile field changes, settings changes
- After all tests, the cleanup protocol (section 12) reverses these changes

_Why_: Read-only testing misses entire categories of bugs — form validation, submission flows, data persistence, state transitions. The `[TEST]` prefix and cleanup protocol keep the database tidy.

## 10. Report Generation

After all tests complete, generate a report file:

- Path: `.reports/browser-test-YYYY-MM-DD[-suffix].md` (use today's date; add a short suffix like `-v02` if a report already exists for today)
- Create the `.reports/` directory if it doesn't exist

### Report Template

```markdown
# Mesh UI Test Report — YYYY-MM-DD

## Summary

- **Date**: YYYY-MM-DD
- **Mode**: flows | visual | full
- **Viewport**: desktop | mobile | both
- **Target**: all | specific route/flow
- **Bugs Found**: N (C critical, H high, M medium, L low)
- **Flows Passed**: X/10 (if flows were run)
- **Pages Scanned**: Y (if visual was run)
- **Test Data Cleaned**: yes | partial | no

## Bugs

### BUG-001: [Title]

- **Severity**: critical | high | medium | low
- **Category**: layout | style | UX | functionality | accessibility | responsiveness
- **Page**: /route
- **Viewport**: desktop | mobile | both
- **Steps to Reproduce**:
  1. Navigate to /route
  2. Do X
  3. Observe Y
- **Expected**: What should happen
- **Actual**: What actually happens
- **Suggested Fix**: Brief suggestion (e.g. "add `overflow-hidden` to container")

### Example Bug Entry

> ### BUG-002: Category chips overflow on mobile
>
> - **Severity**: medium
> - **Category**: responsiveness
> - **Page**: /discover
> - **Viewport**: mobile
> - **Steps to Reproduce**:
>   1. Navigate to /discover at 375px width
>   2. Observe the category chip row
> - **Expected**: Chips scroll horizontally or wrap to a second line
> - **Actual**: Chips overflow the container and cause horizontal page scroll
> - **Suggested Fix**: Add `overflow-x-auto` and `flex-nowrap` to the chip container

## Flow Tests

| #   | Flow           | Status    | Notes |
| --- | -------------- | --------- | ----- |
| 1   | Authentication | PASS/FAIL |       |
| 2   | Navigation     | PASS/FAIL |       |
| ... | ...            | ...       | ...   |

## Pages Tested

| Page     | Route     | Desktop   | Mobile    | Notes |
| -------- | --------- | --------- | --------- | ----- |
| Discover | /discover | PASS/FAIL | PASS/FAIL |       |
| ...      | ...       | ...       | ...       | ...   |

## Cleanup

| Entity        | ID      | Action   | Result  |
| ------------- | ------- | -------- | ------- |
| Posting       | abc-123 | Deleted  | Success |
| Profile field | bio     | Reverted | Success |
| ...           | ...     | ...      | ...     |

## Test Environment

- **Browser**: Chrome (via Claude-in-Chrome)
- **Dev server**: localhost:3000
- **Date**: YYYY-MM-DD
```

After writing the report, tell the user the file path and give a brief summary of findings.

## 11. Severity Guide

| Level        | Meaning                                                       | Examples                                                                        |
| ------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **Critical** | Feature is broken or unusable, blocks core workflows          | Login fails, page crashes, data loss, posting creation errors                   |
| **High**     | Feature works but with significant issues affecting usability | Form doesn't validate, navigation broken on mobile, incorrect data displayed    |
| **Medium**   | Noticeable issue that doesn't block functionality             | Layout overflow at certain widths, inconsistent spacing, missing loading states |
| **Low**      | Minor cosmetic or polish issue                                | Slight alignment off, icon slightly wrong size, non-ideal empty state text      |

## 12. Cleanup Protocol

After all tests complete, reverse test data using the tracking list:

1. **Delete test postings** — navigate to each test posting and use the delete/archive action, or use API calls
2. **Withdraw applications** — if User 2 applied to a posting, withdraw via API
3. **Remove connection requests** — cancel or remove any test connections
4. **Revert profile changes** — restore any modified profile fields to their original values
5. **Revert settings changes** — restore any toggled settings to their original values
6. **Log cleanup results** in the report's Cleanup section

_Why_: Even though the dev database is disposable, cleaning up prevents test data from accumulating across multiple test runs and confusing future tests.

If cleanup fails for any entity, log it as a warning in the report (not a bug).

## 13. Error Recovery

### MCP Disconnection

The Claude-in-Chrome extension may disconnect periodically. If a browser tool call fails:

1. Wait 3–5 seconds
2. Call `tabs_context_mcp` to reconnect
3. Retry the failed action
4. If it fails 3 times, report the issue and move on to the next test

### Page Load Failures

If a page doesn't load:

1. Take a screenshot to document the state
2. Try navigating again
3. If still failing, record as a bug and continue

### Element Not Found

If an expected element isn't found:

1. Take a screenshot
2. Try `find` with alternative descriptions
3. If still not found, record as a bug and continue

### Test Data Leak

If a test session is interrupted before cleanup completes:

1. Check the test-data tracking list for uncleaned entities
2. On next test run, search for entities prefixed with `[TEST]` and clean them up
3. Log any orphaned test data found in the report
