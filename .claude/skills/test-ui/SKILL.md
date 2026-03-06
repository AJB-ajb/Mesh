---
name: test-ui
description: "Browser-based UI testing for Mesh. Tests use-case flows end-to-end from the user's perspective, flags bugs, UX friction, and unintuitive behavior. Supports multi-user scenarios via a two-agent pattern (one in the browser, one via API). Produces structured bug reports. Use whenever someone says 'test the UI', 'run browser tests', 'QA the app', 'check the pages', 'visual regression', 'test mobile layout', 'test the flow', or 'run use-case tests'."
argument-hint: "[use-case description | flows | visual | full] [mobile | desktop] [route-or-area]"
---

# Browser UI Testing Skill

## 1. Philosophy

Test Mesh **the way a real user would use it** — not as a checklist of UI elements, but as someone trying to accomplish a goal. The most valuable findings are not pixel-level bugs but **UX friction**: confusing flows, unintuitive interactions, missing feedback, dead ends, and moments where a user would hesitate or give up.

### What to look for

- **Friction**: Steps that feel unnecessary, confusing, or slow
- **Dead ends**: States where the user doesn't know what to do next
- **Missing feedback**: Actions with no visible response (loading, success, error)
- **Inconsistency**: Similar actions that behave differently across pages
- **Discoverability**: Features that exist but are hard to find
- **Broken flows**: Errors, crashes, wrong redirects, lost data
- **Responsive issues**: Layout problems at different viewport sizes

## 2. Mode Selection

Parse `$ARGUMENTS` along four dimensions:

| Dimension    | Values                                                       | Default                   |
| ------------ | ------------------------------------------------------------ | ------------------------- |
| **Scope**    | `flows`, `visual`, `full`, or a **use-case description**     | `full` (run both)         |
| **Viewport** | `mobile`, `desktop`                                          | both                      |
| **Target**   | route path or area name (e.g. `/settings`, `authentication`) | all                       |
| **Server**   | `dev`, `prod`                                                | `prod` (production build) |

When the argument is a **use-case description** (e.g. "new user creates a posting and someone applies"), treat it as a use-case-driven test session (see section 7).

Examples:

- `a user creates a tennis posting and a stranger applies` — use-case-driven test
- `flows mobile` — flow tests at mobile viewport only
- `visual /profile` — visual tests on the profile page only
- `full desktop` — all tests, desktop only
- `dev flows` — flow tests using dev server
- (empty) — full test suite, both viewports

## 3. Prerequisites

Before starting, verify each of these. If any fails, report it and stop.

1. **Server running** at `http://localhost:3000` — start it if needed, then navigate and confirm the page loads.

   **Production mode (default):**

   ```bash
   pnpm build
   pnpm start &
   ```

   **Dev mode (when `dev` flag is set):** Use `pnpm dev &` instead.

   **If a server is already running on port 3000:** Check whether it matches the requested mode. Reuse it if so, otherwise ask the user.

   _Why production by default_: Production builds load faster, produce no compilation delays, and avoid React StrictMode double-renders that confuse element detection.

2. **Browser automation available** — Claude-in-Chrome MCP tools respond.

3. **Test credentials available** — read `spec/testing.md` for test user setup. Verify `.env` contains `TEST_USER_PASSWORD`.

## 4. Setup

1. Call `tabs_context_mcp` to get browser context.
2. Create a new tab with `tabs_create_mcp`.
3. Read `TEST_USER_PASSWORD` from `.env`.
4. Initialize a **test-data tracking list** — an in-memory list to record IDs of any entities created during testing (posting IDs, bookmarks, connection requests, etc.). This drives cleanup at the end.
5. Read `spec/testing.md` for test user credentials and multi-user patterns:
   - **User 1** (primary/browser): `ajb60721@gmail.com`
   - **User 2** (secondary/API): `ajb60722@gmail.com`
   - Password for both: value from `.env`

## 5. App Discovery

Before testing, understand the current state of the app. Routes change as Mesh evolves — discover dynamically.

### Route Discovery

```
Glob pattern="src/app/**/page.tsx"
```

Parse the Next.js App Router directory structure to build a route table. Read `references/pages.md` for guidance on interpreting the directory layout, route groups, and what to look for on each type of page.

### Understand What's Available

Before writing test flows, spend a few minutes exploring:

1. Navigate to the main authenticated page
2. Identify the navigation structure (sidebar, header, mobile nav)
3. Note which features are implemented vs. placeholder
4. Check what actions are available on each page

This exploration informs which use cases can actually be tested end-to-end.

## 6. Multi-User Testing (Two-Agent Pattern)

Mesh's core features involve two users interacting. The skill uses a split approach:

- **User 1** (primary) interacts through the browser UI normally
- **User 2** (secondary) actions are simulated via authenticated API calls

See `spec/testing.md` for the full list of multi-user scenarios.

### Setting Up User 2's Session

1. Log in as User 2 via the browser to establish a session
2. Extract auth cookies/tokens from the browser
3. Switch back to User 1 in the browser
4. Use `javascript_tool` with `fetch()` against `localhost:3000/api/...` routes, passing User 2's credentials

### Key Multi-User Patterns

- User 1 creates posting -> User 2 requests to join -> User 1 accepts -> conversation opens
- User 1 sends connection request -> User 2 accepts
- Sequential invite: User 1 creates posting -> selects User 2 -> User 2 responds

After User 2 acts via API, verify in User 1's browser that the result is visible (notification, updated state, etc.).

## 7. Use-Case-Driven Testing

When a use-case description is provided (or as part of `full` mode), test end-to-end user journeys.

### Use-Case Sources

1. **User-provided**: The developer describes a scenario to test
2. **From spec**: Read `spec/use-cases.md` for documented Mesh use cases — these describe real scenarios with expected behaviors
3. **Access model**: `spec/use-cases.md` also contains access & composition use cases (UC-A1 through UC-A12) with specific verify steps

### How to Run a Use-Case Test

1. **Define the goal**: What is the user trying to accomplish?
2. **Identify the entry point**: Where does the user start?
3. **Walk through naturally**: Follow the path a real user would take, making choices as they would
4. **Note every friction point**: Anything that makes you pause, re-read, or try multiple approaches
5. **Test the happy path first**, then try edge cases (empty inputs, long text, back button, refresh)
6. **Verify the outcome**: Did the user achieve their goal? Is the result visible and correct?

### What Makes a Good Use-Case Test

- **Be specific**: "A user creates a tennis partner posting and a stranger discovers and applies" is better than "test postings"
- **Cross multiple pages**: Good use cases naturally span several routes
- **Include the return trip**: If you create something, check it appears in lists, can be edited, can be deleted
- **Test as a confused user**: Try clicking the "wrong" thing. Is recovery easy?

### Documenting Friction

For each friction point, record:

- **What happened**: The exact interaction that felt wrong
- **Why it's a problem**: What a user would think/feel
- **Severity**: From "mildly confusing" to "completely blocked"
- **Suggestion**: How it could be improved (if obvious)

## 8. Login Helper

1. Navigate to `/login`
2. Take a screenshot to verify the form renders
3. Enter the user's email and password
4. Click "Sign In"
5. Wait for redirect — take a screenshot and note the actual post-login URL
6. Verify the page content loads (not a blank page or error)

**Skip if already authenticated**: Check if the current page shows the authenticated app shell. If so, verify the correct user is logged in.

If login fails, report it as a critical bug and stop.

### Switching Users

To switch from User 1 to User 2 (or vice versa):

1. Sign out via the avatar dropdown -> "Sign out"
2. Run the login helper with the other user's email

## 9. Flow Tests

**When scope is `flows` or `full`.**

These are generic flow patterns — adapt them to what you discover in section 5. Read `references/flows.md` for detailed guidance on each flow.

1. **Authentication** — login works, redirects correctly, session persists
2. **Navigation** — all nav links work, pages load, mobile nav works
3. **Create posting** — full creation flow through the editor/form, track the posting ID
4. **Browse & search** — discover page: search, filter, sort, bookmark
5. **Posting detail** — owner view vs. visitor view, multi-user interaction (User 2 applies)
6. **My content** — find your postings, verify management controls
7. **Connections** — connection list, chat, multi-user flow (User 2 sends request)
8. **Profile** — edit a field, save, verify persistence, revert
9. **Settings** — toggle a preference, verify persistence, revert
10. **Sign out** — session clears, protected routes redirect

For each flow:

- Take screenshots at key verification points
- Record PASS or FAIL
- If FAIL, record a detailed bug
- **Also record UX friction** even on PASS — a flow can work but still be confusing

## 10. Visual Tests

**When scope is `visual` or `full`.**

For each discovered page:

1. Navigate to the page (log in first if protected)
2. **Desktop check** (skip if viewport is `mobile` only) — resize to 1440x900, screenshot, apply checklist
3. **Mobile check** (skip if viewport is `desktop` only) — resize to 375x812, screenshot, apply checklist
4. Record any issues found

### Visual Checklist

1. **Layout integrity** — no overflow, no overlapping elements, no unintended horizontal scroll
2. **Typography** — readable sizes (min 14px body), proper hierarchy
3. **Spacing** — consistent padding/margins, nothing cramped or floating
4. **Touch targets** — buttons/links min 44px on mobile, visible hover/focus states
5. **Responsive behavior** — content reflows properly, nav adapts, nothing cut off
6. **Color & contrast** — text readable, interactive elements distinguishable
7. **Empty states** — helpful messages when no data, clear call to action
8. **Loading states** — feedback during data fetch, not a blank void
9. **Error states** — what happens on bad input, failed requests, missing data?
10. **Consistency** — similar elements styled the same across pages

## 11. Stateful Testing

Exercise full CRUD — don't just look at pages, interact with them.

- **Prefix test data** with `[TEST]` so it's identifiable
- **Track all created entity IDs** in the test-data tracking list
- **Types to track**: posting IDs, bookmark IDs, connection request IDs, profile field changes, settings changes
- After all tests, the cleanup protocol (section 14) reverses these changes

## 12. Report Generation

After all tests complete, generate a report:

- Path: `.reports/browser-test-YYYY-MM-DD[-suffix].md` (add `-v02` etc. if a report already exists for today)
- Create `.reports/` if it doesn't exist

### Report Template

```markdown
# Mesh UI Test Report — YYYY-MM-DD

## Summary

- **Date**: YYYY-MM-DD
- **Mode**: flows | visual | full | use-case
- **Viewport**: desktop | mobile | both
- **Target**: all | specific route/flow/use-case
- **Bugs Found**: N (C critical, H high, M medium, L low)
- **UX Friction Points**: N
- **Flows Passed**: X/10 (if flows were run)
- **Pages Scanned**: Y (if visual was run)
- **Test Data Cleaned**: yes | partial | no

## UX Friction Points

Issues that aren't bugs but make the experience worse. Ordered by impact.

### FRICTION-001: [Short description]

- **Where**: /route or flow name
- **What happened**: Describe the interaction
- **Why it's a problem**: What a user would think/feel
- **Impact**: high | medium | low
- **Suggestion**: How to improve it

## Bugs

### BUG-001: [Title]

- **Severity**: critical | high | medium | low
- **Category**: layout | functionality | UX | accessibility | responsiveness
- **Page**: /route
- **Viewport**: desktop | mobile | both
- **Steps to Reproduce**:
  1. Step one
  2. Step two
- **Expected**: What should happen
- **Actual**: What actually happens
- **Suggested Fix**: Brief suggestion

## Flow Tests

| #   | Flow           | Status    | Notes |
| --- | -------------- | --------- | ----- |
| 1   | Authentication | PASS/FAIL |       |
| ... | ...            | ...       | ...   |

## Pages Tested

| Page | Route | Desktop | Mobile | Notes |
| ---- | ----- | ------- | ------ | ----- |
| ...  | ...   | ...     | ...    | ...   |

## Cleanup

| Entity | ID  | Action | Result |
| ------ | --- | ------ | ------ |
| ...    | ... | ...    | ...    |

## Test Environment

- **Browser**: Chrome (via Claude-in-Chrome)
- **Server**: production build | dev server (localhost:3000)
- **Date**: YYYY-MM-DD
```

## 13. Severity Guide

| Level        | Meaning                                             | Examples                                                     |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------ |
| **Critical** | Feature broken or unusable, blocks core workflows   | Login fails, page crashes, data loss, creation errors        |
| **High**     | Feature works but with significant usability issues | Form doesn't validate, nav broken on mobile, wrong data      |
| **Medium**   | Noticeable issue that doesn't block functionality   | Layout overflow, inconsistent spacing, missing loading state |
| **Low**      | Minor cosmetic or polish issue                      | Slight alignment, icon sizing, non-ideal empty state text    |

## 14. Cleanup Protocol

After all tests complete, reverse test data using the tracking list:

1. Delete test postings (navigate and use delete action, or via API)
2. Withdraw applications/join requests
3. Remove test connections
4. Revert profile field changes to original values
5. Revert settings changes to original values
6. Log results in the report's Cleanup section

If cleanup fails for any entity, log it as a warning (not a bug).

## 15. Error Recovery

### MCP Disconnection

If a browser tool call fails:

1. Wait 3-5 seconds
2. Call `tabs_context_mcp` to reconnect
3. Retry the failed action
4. If it fails 3 times, report and move on

### Page Load Failures

1. Screenshot the state
2. Try navigating again
3. If still failing, record as a bug and continue

### Element Not Found

1. Screenshot the page
2. Try `find` with alternative descriptions
3. If still not found, record as a bug and continue

### Test Data Leak

If a session is interrupted before cleanup:

1. On next run, search for entities prefixed with `[TEST]` and clean them up
2. Log any orphaned test data in the report
