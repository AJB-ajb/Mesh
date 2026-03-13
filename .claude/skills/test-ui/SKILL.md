---
name: test-ui
description: "Browser-based UI testing. Tests use-case flows end-to-end from the user's perspective, flags bugs, UX friction, and unintuitive behavior. Prioritizes critical user journeys and adapts to whatever the app currently offers. Supports multi-user scenarios via a two-agent pattern. Use whenever someone says 'test the UI', 'run browser tests', 'QA the app', 'check the pages', 'visual regression', 'test mobile layout', 'test the flow', or 'run use-case tests'."
argument-hint: "[use-case description | visual | full] [mobile | desktop] [route-or-area]"
---

# Browser UI Testing

## Philosophy

Test **the way a real user would** — not as a checklist of UI elements, but as someone trying to accomplish a goal. The most valuable findings are **UX friction**: confusing flows, dead ends, missing feedback, and moments where a user would hesitate or give up.

### What to look for

- **Friction**: Steps that feel unnecessary, confusing, or slow
- **Dead ends**: States where the user doesn't know what to do next
- **Missing feedback**: Actions with no visible response
- **Inconsistency**: Similar actions that behave differently
- **Broken flows**: Errors, crashes, wrong redirects, lost data
- **Responsive issues**: Layout problems at different viewport sizes

## Arguments

Parse `$ARGUMENTS` along these dimensions:

| Dimension    | Values                                 | Default |
| ------------ | -------------------------------------- | ------- |
| **Scope**    | use-case description, `visual`, `full` | `full`  |
| **Viewport** | `mobile`, `desktop`                    | both    |
| **Target**   | route path or area name                | all     |
| **Server**   | `dev`, `prod`                          | `prod`  |

When the argument is a **use-case description** (e.g. "new user signs up and creates their first project"), treat it as a use-case-driven test — skip discovery and go straight to that flow.

## Prerequisites

1. **Dev server running** at `http://localhost:3000`:

   ```bash
   # Production build (default — faster, no StrictMode double-renders)
   pnpm build && pnpm start &
   # Dev mode (when `dev` flag is set)
   pnpm dev &
   ```

   If a server is already running on port 3000, check it matches the requested mode. Reuse if so.

2. **Browser automation** — Claude-in-Chrome MCP tools respond. Call `tabs_context_mcp` first.
3. **Test credentials** — read `spec/testing.md` for test user setup and `.env` for `TEST_USER_PASSWORD`.

## Discovery

Before testing, understand what the app does and what matters most.

### 1. Read use cases

Read `spec/0-use-cases.md` (or equivalent). These are the source of truth for what real users do. Each use case becomes a candidate test flow, ordered by criticality.

### 2. Discover routes

```
Glob pattern="src/app/**/page.tsx"
```

See `references/pages.md` for how to interpret Next.js App Router structure. Build a route table grouped by access level (public, auth, protected, dynamic).

### 3. Explore the app

Navigate the main authenticated pages. Identify:

- Navigation structure (sidebar, header, bottom bar, mobile nav)
- Which features are implemented vs. placeholder
- What actions are available on each page

This informs which use cases can actually be tested end-to-end.

## Test Prioritization

Not all flows are equally important. Test in this order:

### Tier 1 — Critical (test these first)

- **Authentication**: Login, session persistence, sign-out. If this is broken, nothing else works.
- **Core creation flow**: Whatever the primary "create" action is (a post, project, document, etc.)
- **Core discovery flow**: Can users find things other users created?

### Tier 2 — Important

- **Multi-user interactions**: The flows where two users interact (apply, accept, message, connect)
- **Navigation**: All nav links work, mobile nav adapts, no dead links
- **Profile/settings**: Edit, save, verify persistence

### Tier 3 — Polish

- **Edge cases**: Empty states, long text, back button, refresh mid-flow
- **Visual consistency**: Layout, spacing, responsive behavior across viewports
- **Error recovery**: What happens when things go wrong?

Within each tier, **align with spec use cases** — test the scenarios documented in `spec/0-use-cases.md` rather than inventing abstract test cases. The use cases describe real user goals; the test should verify those goals are achievable.

## Use-Case-Driven Testing

Each test is a user journey with a goal. Follow this pattern:

1. **Define the goal**: What is the user trying to accomplish? (from spec use case or user-provided)
2. **Identify the entry point**: Where does the user start?
3. **Walk through naturally**: Follow the path a real user would take
4. **Note every friction point**: Anything that makes you pause, re-read, or try multiple approaches
5. **Test the happy path first**, then edge cases
6. **Verify the outcome**: Did the user achieve their goal? Is the result visible and correct?
7. **Test the return trip**: If you created something, check it appears in lists, can be edited/deleted

### Documenting friction

For each friction point:

- **What happened**: The exact interaction that felt wrong
- **Why it's a problem**: What a user would think/feel
- **Severity**: "mildly confusing" to "completely blocked"
- **Suggestion**: How it could be improved

## Multi-User Testing

Many apps involve two users interacting. Use a split approach:

- **User 1** (primary) interacts through the browser
- **User 2** (secondary) acts via authenticated API calls

See `spec/testing.md` for multi-user credentials and patterns.

### Setting Up User 2

1. Log in as User 2 via the browser to establish a session
2. Extract auth cookies/tokens
3. Switch back to User 1
4. Use `javascript_tool` with `fetch()` against API routes, passing User 2's credentials

After User 2 acts via API, verify in User 1's browser that the result is visible.

## Visual Tests

**When scope is `visual` or `full`.**

For each discovered page:

1. Navigate to the page
2. **Desktop** (1440x900) — screenshot, apply checklist
3. **Mobile** (375x812) — screenshot, apply checklist

### Checklist

1. Layout integrity — no overflow, overlap, horizontal scroll
2. Typography — readable sizes, proper hierarchy
3. Spacing — consistent, nothing cramped
4. Touch targets — min 44px on mobile
5. Responsive behavior — content reflows, nav adapts
6. Empty/loading/error states — helpful, not blank
7. Consistency — similar elements styled the same

## Stateful Testing

When creating test data:

- Prefix with `[TEST]` for easy identification
- Track all created entity IDs for cleanup
- After tests complete, reverse all changes (delete test entities, revert edits)

## Login Helper

1. Navigate to `/login`
2. Screenshot to verify form renders
3. Enter credentials, submit
4. Verify redirect to authenticated page
5. If already authenticated, verify correct user

To switch users: sign out via UI, log in with other credentials.

## Report

Path: `.reports/browser-test-YYYY-MM-DD[-suffix].md`

```markdown
# UI Test Report — YYYY-MM-DD

## Summary

- **Scope**: [use-case description | visual | full]
- **Viewport**: desktop | mobile | both
- **Bugs Found**: N (C critical, H high, M medium, L low)
- **UX Friction Points**: N
- **Test Data Cleaned**: yes | partial | no

## Use Cases Tested

| #   | Use Case                     | Status    | Notes |
| --- | ---------------------------- | --------- | ----- |
| 1   | [from spec or user-provided] | PASS/FAIL |       |

## UX Friction Points

### FRICTION-001: [Short description]

- **Where**: /route or flow
- **What happened**: ...
- **Impact**: high | medium | low
- **Suggestion**: ...

## Bugs

### BUG-001: [Title]

- **Severity**: critical | high | medium | low
- **Page**: /route
- **Viewport**: desktop | mobile | both
- **Steps to Reproduce**: ...
- **Expected**: ...
- **Actual**: ...

## Cleanup

| Entity | ID  | Action | Result |
| ------ | --- | ------ | ------ |
```

## Severity Guide

| Level    | Meaning                     | Examples                               |
| -------- | --------------------------- | -------------------------------------- |
| Critical | Blocks core workflows       | Login fails, page crashes, data loss   |
| High     | Significant usability issue | Form broken, nav broken on mobile      |
| Medium   | Noticeable, doesn't block   | Layout overflow, missing loading state |
| Low      | Minor cosmetic              | Slight alignment, icon sizing          |

## Error Recovery

- **MCP disconnect**: Wait 3s, call `tabs_context_mcp`, retry. After 3 failures, report and move on.
- **Page load failure**: Screenshot, retry, record as bug if persistent.
- **Element not found**: Screenshot, try `find` with alternatives, record as bug.
