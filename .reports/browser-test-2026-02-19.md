# Mesh UI Test Report - 2026-02-19

## Summary

- **Mode**: both (flows + visual spot checks)
- **Bugs Found**: 2 (0 critical, 0 high, 1 medium, 1 low) — 1 false positive retracted
- **Flows Passed**: 9/11 (2 N/A — Matches and Bookmarks pages removed)
- **Pages Scanned**: 10 (desktop only, via flow traversal)

## Bugs

### ~~BUG-001: Notification bell click does nothing~~ — FALSE POSITIVE

- **Severity**: ~~high~~ retracted
- **Category**: test tooling artifact
- **Notes**: The notification dropdown works correctly. The browser automation tool's click mechanism triggered the component's outside-click handler (`mousedown` event), causing the dropdown to immediately open and close within the same event cycle. Verified working via JavaScript `element.click()` and screenshot — dropdown renders with 3 notifications, "Mark all as read", and "View all".

### BUG-002: Discover search has no clear (X) button — FIXED

- **Severity**: medium
- **Category**: UX
- **Page**: `/discover`
- **Viewport**: desktop
- **Description**: After typing in the Discover page search bar, there is no way to clear the search text except manually selecting and deleting. The input only shows a microphone icon on the right — no X/clear button.
- **Expected**: A clear (X) button should appear when text is present in the search input, similar to the global search component (`src/components/layout/global-search.tsx` lines 143-155).
- **Actual**: The right side of the input only shows either a loading spinner or the microphone (SpeechInput) button. No clear button exists.
- **Root cause**: The search input in `src/app/(dashboard)/discover/page.tsx` (lines 148-181) is missing a conditional clear button. The global search component has a working implementation to reference.
- **Fix**: Added conditional `{nlQuery && <button><X /></button>}` between input and mic button. Clears both `nlQuery` and `searchQuery`. Widened right padding to `pr-16` to fit both clear and mic buttons. Commit `9f13039`.

### BUG-003: "Back to dashboard" label is misleading — FIXED

- **Severity**: low
- **Category**: UX
- **Page**: `/profile`, `/settings`
- **Viewport**: both
- **Description**: Profile and Settings pages show a "Back to dashboard" link at the top, but there is no Dashboard page in the app. The link navigates to `/active` via redirect.
- **Expected**: The link text should reflect the actual destination or use a generic label like "Back".
- **Actual**: Link says "Back to dashboard" but navigates to `/active`. There is no Dashboard in the sidebar navigation.
- **Root cause**: Label defined in `src/lib/labels.ts` line 391: `backToDashboard: "Back to dashboard"`. Used in `src/app/(dashboard)/profile/page.tsx` line 121 and `src/app/(dashboard)/settings/page.tsx` line 248. Both `href` values already point to `/active`.
- **Fix**: Updated `src/lib/labels.ts` — changed `backToDashboard` value from `"Back to dashboard"` to `"Back"`. Commit `9f13039`.

## Flow Tests

| #   | Flow            | Status | Notes                                                              |
| --- | --------------- | ------ | ------------------------------------------------------------------ |
| 1   | Authentication  | PASS   | Login form renders correctly; redirects to `/active` after login   |
| 2   | Dashboard Nav   | PASS   | All sidebar items navigate correctly; nav differs from old spec    |
| 3   | Create Posting  | PASS   | Both AI Extract and Fill Form modes work                           |
| 4   | Browse Postings | PASS   | Cards render, category chips filter, search accepts text (BUG-002) |
| 5   | Posting Detail  | PASS   | Detail page loads with full info, compatibility, actions           |
| 6   | Matches         | N/A    | Page removed — match % integrated into Discover cards              |
| 7   | Bookmarks       | N/A    | Page removed — "Saved" filter on Discover replaces it              |
| 8   | Connections     | PASS   | Split-pane layout, empty state, search, +Add button                |
| 9   | Profile         | PASS   | GitHub enrichment, Quick Update, General Info all render           |
| 10  | Settings        | PASS   | Account info, Connected Accounts, Notification Preferences         |
| 11  | Sign Out        | PASS   | Dropdown opens, sign out works, redirects to `/login`              |

## Pages Tested

| Page           | Route            | Desktop | Mobile | Notes                                           |
| -------------- | ---------------- | ------- | ------ | ----------------------------------------------- |
| Landing        | `/`              | OK      | —      | Redirects to login when not authenticated       |
| Login          | `/login`         | OK      | —      | All elements render, OAuth buttons present      |
| Discover       | `/discover`      | OK      | —      | Cards, chips, search work; missing clear button |
| My Postings    | `/my-postings`   | OK      | —      | Cards with Edit/Manage/Activity buttons         |
| Active         | `/active`        | OK      | —      | All/Created/Joined tabs work                    |
| Connections    | `/connections`   | OK      | —      | Split-pane, empty state is good                 |
| New Posting    | `/postings/new`  | OK      | —      | AI Extract + Fill Form modes both work          |
| Posting Detail | `/postings/[id]` | OK      | —      | Full detail, compatibility, creator sidebar     |
| Profile        | `/profile`       | OK      | —      | BUG-003: misleading "Back to dashboard" label   |
| Settings       | `/settings`      | OK      | —      | BUG-003: misleading "Back to dashboard" label   |

## Navigation Structure (Actual)

The sidebar navigation has been restructured from the original spec:

| Old (spec) | New (actual) | Route                            |
| ---------- | ------------ | -------------------------------- |
| Dashboard  | —            | `/active` (default)              |
| Postings   | Discover     | `/discover`                      |
| —          | My Postings  | `/my-postings`                   |
| Matches    | —            | (integrated into Discover cards) |
| Bookmarks  | —            | ("Saved" filter on Discover)     |
| Inbox      | Connections  | `/connections`                   |
| —          | Active       | `/active`                        |
| Profile    | Profile      | `/profile`                       |
| Settings   | Settings     | `/settings`                      |
