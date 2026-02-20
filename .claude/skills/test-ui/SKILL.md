---
name: test-ui
description: Browser-based UI testing for Mesh. Tests user flows and visual integrity, producing structured bug reports.
argument-hint: "[flows|visual]"
---

# Browser UI Testing Skill

## 1. Mode Selection

Parse `$ARGUMENTS` to determine test mode:

- `flows` — run flow tests only
- `visual` — run visual inspection only
- empty or anything else — run both

## 2. Prerequisites

Before starting, verify:

1. Dev server is running at `http://localhost:3000` — check with a quick fetch or navigate and confirm the page loads
2. Browser automation is available (Claude-in-Chrome MCP tools)
3. `.env` file exists with `TEST_USER_PASSWORD`

If any prerequisite fails, report it and stop.

## 3. Setup

1. Call `tabs_context_mcp` to get browser context
2. Create a new tab with `tabs_create_mcp`
3. Read `TEST_USER_PASSWORD` from `.env`:
   ```
   Grep pattern="TEST_USER_PASSWORD" path=".env"
   ```
4. Store credentials:
   - Email: `ajb60721@gmail.com`
   - Password: value from `.env`

## 4. Login Helper

Use this procedure whenever authentication is needed:

1. Navigate to `http://localhost:3000/login`
2. Wait for the page to load (take screenshot to verify)
3. Find the email input, enter `ajb60721@gmail.com`
4. Find the password input, enter the password from `.env`
5. Click the "Sign In" button
6. Wait for redirect — verify URL is `/dashboard`
7. Take screenshot to confirm successful login

If login fails, report it as a critical bug and stop.

## 5. Flow Tests

**When mode is `flows` or both.**

Read `flows.md` (in this skill directory) for the 11 flow test scripts. Execute each flow in order:

1. Authentication
2. Dashboard Navigation
3. Create Posting
4. Browse Postings
5. Posting Detail
6. Matches
7. Bookmarks
8. Inbox
9. Profile
10. Settings
11. Sign Out

For each flow:

- Follow the steps exactly as written
- Take screenshots at key verification points
- Record result as PASS or FAIL
- If FAIL, record a bug with details

## 6. Visual Tests

**When mode is `visual` or both.**

Read `pages.md` (in this skill directory) for the page registry. For each page listed:

1. Navigate to the page
2. **Desktop check** — resize to 1440x900, take screenshot, apply the 10-point visual checklist
3. **Mobile check** — resize to 375x812, take screenshot, apply the 10-point visual checklist
4. Record any issues found as bugs

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

## 7. Report Generation

After all tests complete, generate a report file:

- Path: `.reports/browser-test-YYYY-MM-DD.md` (use today's date)
- Create the `.reports/` directory if it doesn't exist

Use this template:

```markdown
# Mesh UI Test Report - YYYY-MM-DD

## Summary

- **Mode**: flows | visual | both
- **Bugs Found**: N (C critical, H high, M medium, L low)
- **Flows Passed**: X/11 (if flows were run)
- **Pages Scanned**: Y (if visual was run)

## Bugs

### BUG-001: [Title]

- **Severity**: critical | high | medium | low
- **Category**: layout | style | UX | functionality | accessibility | responsiveness
- **Page**: /route
- **Viewport**: desktop | mobile | both
- **Description**: What is wrong
- **Expected**: What should happen
- **Actual**: What actually happens

## Flow Tests

| #   | Flow | Status | Notes |
| --- | ---- | ------ | ----- |

## Pages Tested

| Page | Route | Desktop | Mobile | Notes |
| ---- | ----- | ------- | ------ | ----- |
```

After writing the report, tell the user the file path and give a brief summary of findings.

## 8. Error Recovery

### MCP Disconnection

The Claude-in-Chrome extension may disconnect periodically. If a browser tool call fails:

1. Wait 3-5 seconds
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

## 9. Constraints

- **Never submit forms** — fill fields to verify they work, but never click submit/save/create
- **Never create data** — don't create postings, send messages, or modify user data
- **Never change settings** — don't toggle settings, change passwords, or link accounts
- **Screenshots for evidence** — take screenshots at every verification point for the report
- **Read-only testing** — this is an observation-only test pass
