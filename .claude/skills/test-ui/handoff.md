# MeshIt Browser Test — Quick Handoff

Use this prompt with a browser agent (Antigravity, Gemini Flash/Pro, etc.) for a quick UI test pass.

---

## Setup

- **App URL**: `http://localhost:3000`
- **Login**: email `ajb60721@gmail.com`, password `meshit-test-2024!` (update if changed)
- **Login page**: `/login` — enter email + password, click Sign In, verify redirect to `/dashboard`

## Pages to Visit

After logging in, visit each page and check for issues:

| Page        | Route           | What to Check                                                  |
| ----------- | --------------- | -------------------------------------------------------------- |
| Dashboard   | `/dashboard`    | Stats cards render, quick actions visible, activity list loads |
| Postings    | `/postings`     | Tabs work, search accepts input, posting cards or empty state  |
| New Posting | `/postings/new` | Form fields render (DO NOT submit)                             |
| Matches     | `/matches`      | Cards or empty state, no errors                                |
| Bookmarks   | `/bookmarks`    | Cards or empty state, no errors                                |
| Inbox       | `/inbox`        | Notifications + conversations tabs, lists load                 |
| Profile     | `/profile`      | Form populated with user data, GitHub section visible          |
| Settings    | `/settings`     | Account settings, linked providers visible                     |

## What to Check on Every Page

1. No layout overflow, overlapping, or horizontal scroll
2. Text is readable, proper heading sizes
3. Buttons/links are clickable and adequately sized
4. On mobile (375px wide): sidebar collapses, content reflows
5. Empty states show helpful messages (not blank)
6. No broken images or missing icons
7. Loading states shown (not blank flash)

## Rules

- **Observe only** — never submit forms, create data, or change settings
- Fill form fields to test they work, then navigate away without saving
- Take screenshots as evidence for any bugs found

## Bug Report Format

Write findings to `.reports/browser-test-handoff.md` using this format:

```
# Browser Test Report - [DATE]

## Summary
Bugs found: N

## Bugs

### BUG-001: [Short title]
- Severity: critical | high | medium | low
- Page: /route
- Viewport: desktop | mobile | both
- Description: What is wrong
- Expected: What should happen
- Actual: What happens instead
```
