# Mesh UI Test Report — 2026-03-06

## Summary

- **Date**: 2026-03-06
- **Mode**: full
- **Viewport**: desktop (mobile resize blocked by window manager — see notes)
- **Target**: all
- **Bugs Found**: 3 (0 critical, 1 high, 1 medium, 1 low)
- **Flows Passed**: 10/10
- **Pages Scanned**: 10
- **Test Data Cleaned**: yes

## Notes

**Mobile viewport limitation:** The Chrome window could not be resized below the desktop viewport (1717x834) due to the Linux tiling window manager (Tuxedo OS). The `resize_window` MCP tool reported success but the actual viewport did not change. All testing was performed at desktop width. Mobile-specific code was reviewed via source inspection instead.

**Stale chunk error on initial load:** After building the production app, the browser had cached Turbopack chunks from a previous dev server session, causing `ChunkLoadError` on every page. A hard refresh after restarting the production server resolved this. Not a code bug — an environment issue.

## Bugs

### BUG-001: Login page OAuth buttons render as tiny unlabeled gray boxes on first load with stale CSS

- **Severity**: low
- **Category**: style
- **Page**: /login
- **Viewport**: desktop
- **Steps to Reproduce**:
  1. Have a previous dev server session's cached chunks in the browser
  2. Start a production build server
  3. Navigate to /login before hard-refreshing
  4. Observe the OAuth buttons section
- **Expected**: OAuth buttons (Google, GitHub, LinkedIn) render with provider icons and proper sizing
- **Actual**: Three tiny gray unlabeled boxes appear in the "Or continue with" section
- **Note**: This resolved after hard refresh cleared stale chunks. On a clean load, the OAuth buttons render correctly with proper icons. This is an environment issue, not a production bug.

### BUG-002: Posting detail title truncated with unclear ellipsis character

- **Severity**: medium
- **Category**: UX
- **Page**: /postings/:id
- **Viewport**: desktop
- **Steps to Reproduce**:
  1. Create a posting with a long title (e.g., "[TEST] Automated Test Posting - Looking for a developer to collaborate on testing automation")
  2. Navigate to the posting detail page
  3. Observe the title in the page header
- **Expected**: Title either displays in full, wraps to multiple lines, or truncates with a standard "..." ellipsis
- **Actual**: Title shows "[TEST] Automated Test Posting - Looking ·" — truncated with a "·" (middle dot) character that looks like a rendering artifact rather than an intentional truncation indicator
- **Suggested Fix**: Use standard CSS `text-overflow: ellipsis` or allow the title to wrap. If the "·" is intentional as a separator, consider using "..." for truncation instead.

### BUG-003: Connection list item click target unreliable via accessibility ref

- **Severity**: high
- **Category**: accessibility / UX
- **Page**: /connections
- **Viewport**: desktop
- **Steps to Reproduce**:
  1. Navigate to /connections
  2. Click on a connection name (e.g., "Wilson") in the left panel via keyboard/accessibility methods
  3. Observe the right panel
- **Expected**: Chat view opens for the selected connection
- **Actual**: First click via the accessible button ref did not open the chat. A second click at direct coordinates on the same element worked.
- **Note**: This suggests the clickable area of the connection list button may be smaller than the visual area, or there's a z-index/overlay issue intercepting clicks. This would be especially problematic on mobile where precise tapping is harder.
- **Suggested Fix**: Ensure the entire connection list item row is a single clickable area with proper button/link semantics. Check for any overlapping elements or padding issues that might intercept clicks.

## Flow Tests

| #   | Flow            | Status | Notes                                                                    |
| --- | --------------- | ------ | ------------------------------------------------------------------------ |
| 1   | Authentication  | PASS   | Login works, redirects to /posts                                         |
| 2   | Navigation      | PASS   | All sidebar links work: Discover, Posts, Connections, Profile, Settings  |
| 3   | Create Posting  | PASS   | Unified editor works, AI auto-extracts category/skills/tags              |
| 4   | Browse & Filter | PASS   | Search, category chips, sort dropdown all functional                     |
| 5   | Posting Detail  | PASS   | Owner view with Edit/Manage/Project tabs, Join Requests section          |
| 6   | Posts Page      | PASS   | Filter chips work, test posting appeared correctly                       |
| 7   | Connections     | PASS   | Split-pane layout, chat opens (see BUG-003 about click target)           |
| 8   | Profile         | PASS   | Bio editor, skills, languages, availability calendar visible             |
| 9   | Settings        | PASS   | Account info, connected accounts, notification toggles all render        |
| 10  | Sign Out        | PASS   | Redirects to /login, protected routes redirect correctly with return URL |

## Pages Tested

| Page           | Route         | Desktop | Notes                                               |
| -------------- | ------------- | ------- | --------------------------------------------------- |
| Login          | /login        | PASS    | Well-styled card, OAuth buttons visible             |
| Discover       | /discover     | PASS    | Search, chips, posting cards all work               |
| Posts          | /posts        | PASS    | Filter chips, posting list with management controls |
| Connections    | /connections  | PASS    | Split-pane, chat, search (BUG-003)                  |
| New Posting    | /postings/new | PASS    | Unified editor with AI features                     |
| Posting Detail | /postings/:id | PASS    | Owner view, tabs, truncated title (BUG-002)         |
| Profile        | /profile      | PASS    | Edit form, skills, availability calendar            |
| Settings       | /settings     | PASS    | Account, connected accounts, notifications          |
| Landing        | /             | SKIP    | Redirects to app when authenticated                 |
| Why            | /why          | SKIP    | Informational page, not tested                      |

## Mobile Code Review (source inspection)

Since physical mobile viewport testing was blocked:

- **Bottom bar** (`src/components/layout/bottom-bar.tsx`): Well-implemented with `md:hidden`, 44px min touch targets, safe area insets, keyboard visibility handling
- **Responsive classes**: Pages use `hidden md:block` for desktop-only elements (subtitles, secondary CTAs)
- **Previous mobile fixes**: Recent commit `88f8f5d` fixed mobile text overflow in markdown, chat, and posting cards

## Cleanup

| Entity  | ID                                   | Action          | Result           |
| ------- | ------------------------------------ | --------------- | ---------------- |
| Posting | fce205d0-f953-457f-93e6-ddef8447eb42 | Deleted via API | Success (200 OK) |

## Test Environment

- **Browser**: Chrome (via Claude-in-Chrome)
- **Server**: production build (Next.js 16.1.6, localhost:3000)
- **Viewport**: 1717x834 (desktop — mobile resize blocked)
- **Date**: 2026-03-06
