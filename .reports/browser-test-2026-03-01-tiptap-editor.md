# Mesh UI Test Report - 2026-03-01

## Summary

- **Mode**: both (flows + visual)
- **Focus**: v0.6 Tiptap editor + metadata chips feature validation
- **Bugs Found**: 3 (1 critical — fixed, 1 medium, 1 low)
- **Flows Passed**: 9/11 (2 skipped — not directly relevant to feature)
- **Pages Scanned**: 7

## Bugs

### BUG-001: MeshEditor crashes with SSR hydration error [FIXED]

- **Severity**: critical
- **Category**: functionality
- **Page**: /postings/new, /profile (any page using MeshEditor)
- **Viewport**: both
- **Description**: Tiptap v3 `useEditor` throws "SSR has been detected, please set `immediatelyRender` explicitly to `false`" causing the error boundary to trigger
- **Expected**: Page loads with editor
- **Actual**: "Something went wrong" error page
- **Fix**: Added `immediatelyRender: false` to `useEditor` config in `mesh-editor.tsx`. Committed as `e27772a`.

### BUG-002: "Auto-clean" button text clipped by FAB on mobile

- **Severity**: low
- **Category**: responsiveness
- **Page**: /postings/new
- **Viewport**: mobile (375x812)
- **Description**: The "Auto-clean" text in the text tools row is partially obscured by the floating action button (+) on the right side
- **Expected**: All text tools fully visible without overlap
- **Actual**: "Auto-c..." truncated by FAB overlay

### BUG-003: Raw markdown heading syntax shown in discover card titles

- **Severity**: medium
- **Category**: style
- **Page**: /discover
- **Viewport**: both
- **Description**: Posting card titles display raw markdown like "## Project Proposal" instead of rendering the heading. Pre-existing issue, not caused by Tiptap changes.
- **Expected**: Heading syntax stripped or rendered in card preview
- **Actual**: "## " prefix visible in card title

## Flow Tests

| #   | Flow               | Status | Notes                                                                              |
| --- | ------------------ | ------ | ---------------------------------------------------------------------------------- |
| 1   | Authentication     | PASS   | Already logged in, session active                                                  |
| 2   | Sidebar Navigation | PASS   | All nav items present, routing works                                               |
| 3   | Create Posting     | PASS   | Tiptap editor loads, text input works, slash commands open, chips insert correctly |
| 4   | Browse Postings    | PASS   | Cards render, search bar visible, category chips work                              |
| 5   | Posting Detail     | SKIP   | Not directly relevant to feature                                                   |
| 6   | My Postings        | PASS   | Cards render with correct buttons                                                  |
| 7   | Active Postings    | PASS   | Tabs work (All/Created/Joined)                                                     |
| 8   | Connections        | PASS   | Split-pane layout, search bar, empty state                                         |
| 9   | Profile            | PASS   | MeshEditor renders without crash, all sections visible                             |
| 10  | Settings           | PASS   | Account info, connected accounts visible                                           |
| 11  | Sign Out           | SKIP   | Not directly relevant to feature                                                   |

## Feature-Specific Tests

### Tiptap Editor (Create Posting)

| Test                          | Result | Notes                                                                           |
| ----------------------------- | ------ | ------------------------------------------------------------------------------- |
| Editor renders                | PASS   | After SSR fix (BUG-001)                                                         |
| Text input                    | PASS   | Typed multi-line text, appeared correctly                                       |
| Slash command trigger (/)     | PASS   | Menu appears with 4 commands: time, location, skills, template                  |
| Slash command filtering (/lo) | PASS   | Filters to just /location                                                       |
| Time picker overlay           | PASS   | Opens with day/time selectors, custom range                                     |
| Time chip insertion           | PASS   | Amber chip "weekdays evening (5-10pm)" inserted inline                          |
| Location overlay              | PASS   | Opens with search, Nominatim autocomplete works                                 |
| Location chip insertion       | PASS   | Blue chip "Munchen, Deutschland" inserted inline                                |
| Multiple chips coexist        | PASS   | Time + location chips render side-by-side                                       |
| Suggestion chips              | PASS   | Context-sensitive chips update as text changes                                  |
| Nudge banners                 | PASS   | Timing and location nudges appear, location nudge dismissed after chip inserted |
| Auto-format button            | PASS   | Visible and enabled when text present                                           |
| Auto-clean button             | PASS   | Visible and enabled when text present                                           |
| Post button state             | PASS   | Disabled when empty, enabled with text                                          |
| Mic/voice button              | PASS   | Visible in editor corner                                                        |
| Edit details toggle           | PASS   | Collapsible section works                                                       |

### Profile Page (MeshEditor for bio)

| Test                  | Result | Notes                                   |
| --------------------- | ------ | --------------------------------------- |
| Page loads            | PASS   | No SSR crash after fix                  |
| General info displays | PASS   | Name, headline, about, location visible |
| Availability grid     | PASS   | Day/time grid renders correctly         |

## Pages Tested

| Page           | Route         | Desktop | Mobile | Notes                                   |
| -------------- | ------------- | ------- | ------ | --------------------------------------- |
| Create Posting | /postings/new | PASS    | PASS   | Core feature page — all chip types work |
| Discover       | /discover     | PASS    | —      | BUG-003: raw markdown in card titles    |
| Posts          | /posts        | PASS    | —      |                                         |
| Active         | /active       | PASS    | —      |                                         |
| Connections    | /connections  | PASS    | —      |                                         |
| Profile        | /profile      | PASS    | —      |                                         |
| Settings       | /settings     | PASS    | —      |                                         |
