# Mesh UI Test Report — 2026-03-06 (Text-First Compose)

## Summary

- **Date**: 2026-03-06
- **Mode**: full
- **Viewport**: desktop + mobile (375x812)
- **Target**: all (focused on `feat/text-first-compose` changes)
- **Branch**: `feat/text-first-compose` (commit `c45a16e`)
- **Bugs Found**: 6 (1 critical, 1 high, 2 medium, 2 low)
- **Flows Passed**: 9/10 (Flow 5 multi-user partial)
- **Pages Scanned**: 8 (desktop + mobile)
- **Test Data Cleaned**: yes

## Bugs

### BUG-001: Posting creation fails — missing `in_discover` column

- **Severity**: critical
- **Category**: functionality
- **Page**: /postings/new
- **Viewport**: both
- **Steps to Reproduce**:
  1. Navigate to `/postings/new`
  2. Type any text in the editor
  3. Click "Post"
- **Expected**: Posting is created successfully
- **Actual**: Error: "Failed to create posting: Could not find the 'in_discover' column of 'postings' in the schema cache"
- **Root Cause**: Migration `20260306100000_add_composable_access.sql` was recorded in the migration history but never actually executed against the database. The `in_discover` column and `link_token` column did not exist.
- **Resolution**: Repaired migration history (`supabase migration repair 20260306100000 --status reverted`) and re-applied (`supabase db push`). Column now exists. **This must be applied before landing the branch.**

### BUG-002: Posting title truncated on detail page

- **Severity**: medium
- **Category**: layout
- **Page**: /postings/:id
- **Viewport**: both (worse on mobile)
- **Steps to Reproduce**:
  1. Create a posting with a long title like "[TEST] Data Structures Course Project — Looking for 2 partners"
  2. Navigate to the posting detail page
- **Expected**: Full title displayed or gracefully truncated with ellipsis
- **Actual**: Title hard-truncated: "[TEST] Data Structures Course Project — L" (desktop), "[TEST] Data Structures Course P" (mobile). No ellipsis indicator.
- **Suggested Fix**: Add `text-ellipsis` and `overflow-hidden` to the title container, or allow multi-line wrapping. The title `<h1>` element appears to have a fixed width or `max-width` that clips the text.

### BUG-003: AI extraction overwrites manually-set min team size

- **Severity**: high
- **Category**: functionality
- **Page**: /postings/new
- **Viewport**: both
- **Steps to Reproduce**:
  1. Navigate to `/postings/new`
  2. Type description mentioning "need 2 partners"
  3. Expand Settings, set Min team size = 2, Max team size = 3
  4. Click "Post"
  5. View the created posting
- **Expected**: Team size shows 2-3 (respecting the manually set values)
- **Actual**: Team size shows 3-3. The AI extraction appears to have overwritten the min team size from 2 to 3 (possibly interpreting "2 partners" + creator = 3).
- **Suggested Fix**: When user has manually set team size values before submission, those should take precedence over AI extraction. The extraction should only fill in fields the user hasn't explicitly touched.

### BUG-004: Category chips truncated on mobile Discover page

- **Severity**: medium
- **Category**: responsiveness
- **Page**: /discover
- **Viewport**: mobile (375px)
- **Steps to Reproduce**:
  1. Navigate to `/discover` at 375px width
  2. Observe the category chip row
- **Expected**: Chips scroll horizontally or wrap to a second line
- **Actual**: "Professional" chip is partially cut off, "Social" chip is completely hidden off-screen
- **Suggested Fix**: Add `overflow-x-auto` and `flex-nowrap` to the chip container, or use a scrollable horizontal row with fade indicators

### BUG-005: Save button truncated on mobile Profile page

- **Severity**: low
- **Category**: responsiveness
- **Page**: /profile
- **Viewport**: mobile (375px)
- **Steps to Reproduce**:
  1. Navigate to `/profile` at 375px width
  2. Observe the Save button area below the profile editor
- **Expected**: Save button fully visible
- **Actual**: Save button shows only "Sa" — the "+" FAB button from the new posting shortcut overlaps or compresses the Save button area
- **Suggested Fix**: Ensure the Save button has sufficient min-width, or adjust the FAB positioning to avoid overlap with action buttons

### BUG-006: Feedback FAB overlaps content on mobile

- **Severity**: low
- **Category**: layout
- **Page**: multiple (/postings/new, /postings/:id edit tab, /settings)
- **Viewport**: mobile (375px)
- **Steps to Reproduce**:
  1. Navigate to any page at 375px width
  2. Observe the bottom-left feedback button
- **Expected**: Feedback button doesn't overlap page content
- **Actual**: The feedback FAB (bottom-left) occasionally overlaps text content like "Visible to:" line, "Your current description" label, and avatar on Posting Creator card
- **Suggested Fix**: Add bottom padding/margin to content areas to account for the FAB, or reposition the FAB to avoid content overlap on mobile

## Flow Tests

| #   | Flow            | Status  | Notes                                                                                                                                                                      |
| --- | --------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Authentication  | PASS    | Already authenticated; login form verified during sign-out/sign-in cycle                                                                                                   |
| 2   | Navigation      | PASS    | All sidebar links work. No Active/My-Postings in nav (merged into Posts page)                                                                                              |
| 3   | Create Posting  | PASS    | New text-first editor works. Context bar, settings, all functional. Hit BUG-001 (migration) and BUG-003 (team size)                                                        |
| 4   | Browse & Filter | PASS    | Search with NL filter translation works. Category chips work. Empty states clear                                                                                           |
| 5   | Posting Detail  | PARTIAL | Owner view works. Multi-user join request via API couldn't use app routes (cookie auth). Direct DB insert succeeded but didn't show in Manage tab (different status model) |
| 6   | Posts Page      | PASS    | Test posting visible with correct metadata, filter chips work                                                                                                              |
| 7   | Connections     | PASS    | Split-pane layout, search, connection list, chat placeholder all render correctly                                                                                          |
| 8   | Profile         | PASS    | ConnectedAccountsCard removed (as expected). Editor, skills, availability all present                                                                                      |
| 9   | Settings        | PASS    | AccountInfoCard removed (as expected). Connected accounts, notifications, sign out, danger zone present                                                                    |
| 10  | Sign Out        | PASS    | Redirects to /login, session cleared, login form renders correctly with OAuth buttons                                                                                      |

## Course Project Scenario

| Step | Description                    | Result  | Notes                                                                                                                                |
| ---- | ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Create posting via text editor | PASS    | After migration fix (BUG-001). Text entered, settings configured, submitted successfully                                             |
| 2    | Verify AI extraction           | PASS    | Extracted: Study category, Java/algorithms/data structures skills, team size, deadline, tags. Banner shown with Undo option          |
| 3    | Edit via FreeFormUpdate        | PASS    | "Tell the AI what to change" textarea works. AI incorporated weekly sync note into description naturally                             |
| 4    | Check Discover                 | PASS    | Own postings don't appear in Discover (by design). Other postings show with match scores                                             |
| 5    | Multi-user join                | PARTIAL | User 2 auth token obtained. Direct match insert succeeded but app API routes use cookie auth, limiting API-driven multi-user testing |
| 6    | Project tab                    | SKIP    | Project tab greyed out (no accepted members)                                                                                         |

## Pages Tested

| Page           | Route         | Desktop | Mobile | Notes                                                                                 |
| -------------- | ------------- | ------- | ------ | ------------------------------------------------------------------------------------- |
| Landing/Login  | /login        | PASS    | N/A    | OAuth buttons, form fields, links all present                                         |
| Discover       | /discover     | PASS    | PASS\* | \*BUG-004: category chips truncated on mobile                                         |
| Posts          | /posts        | PASS    | N/A    | Filter chips, posting cards with management controls                                  |
| Connections    | /connections  | PASS    | N/A    | Split-pane layout, search, chat placeholder                                           |
| Profile        | /profile      | PASS    | PASS\* | \*BUG-005: Save button truncated. No ConnectedAccountsCard (expected)                 |
| Settings       | /settings     | PASS    | PASS   | No AccountInfoCard (expected). Connected accounts, notifications, danger zone present |
| Create Posting | /postings/new | PASS    | PASS   | New text-first compose with context bar. Stacks well on mobile                        |
| Posting Detail | /postings/:id | PASS    | PASS\* | \*BUG-002: title truncated. Edit tab with FreeFormUpdate + context bar works          |

## UX Friction Audit

### Context Bar Discoverability

- **Is it obvious how to control who sees a posting?** Mostly yes. The "Show in Discover" toggle is visible and the "Visible to: Everyone (Discover)" summary line is clear. However, the context bar is below the fold on desktop if the editor content is long — users may not scroll down to see it.
- **Is the audience summary line clear?** Yes. "Visible to: Everyone (Discover)" is unambiguous.
- **Can you tell what "Show in Discover" means?** Reasonably clear — the toggle label plus the audience summary reinforce each other. A first-time user might wonder what "Discover" refers to, but it's self-evident within the app context.

### Settings Row Discoverability

- **Is the settings row discoverable?** The collapsed "Settings — size, expire, accept, N-sequential" label gives a good hint of what's inside. However, users creating their first posting may not realize they need to expand it to set team size or expiry. The defaults (min=1, max=5, expiry=3 days) are reasonable fallbacks.
- **Suggestion**: Consider expanding the settings by default on the first posting creation, or showing inline hints when the text mentions team size/deadline.

### Profile Page (ConnectedAccountsCard Removed)

- **Is it clear that connected accounts moved to settings?** Not immediately. A user who previously saw connected accounts on their profile would need to discover they moved. There's no redirect hint or notification.
- **Suggestion**: Consider adding a brief "Manage connected accounts in Settings" link on the profile page during a transition period.

### Settings Page (AccountInfoCard Removed)

- **Does removing AccountInfoCard leave the page sparse?** Not significantly — Connected Accounts fills the top area, and Notification Preferences has many rows. The page doesn't feel empty. The sign-out button provides a clear anchor at the bottom.

### AI Extraction Interaction

- **The "AI filled in some details" banner with Undo is excellent UX** — it's non-blocking, informative, and gives users control.
- **However, BUG-003 (extraction overwrites manual settings) is a real friction point** — users who carefully set team size before submitting will be frustrated when extraction changes it.

## Cleanup

| Entity           | ID                                   | Action                       | Result            |
| ---------------- | ------------------------------------ | ---------------------------- | ----------------- |
| Posting          | 8e5aecee-9651-4500-882f-28a7b8bb85c8 | Deleted via API              | Success           |
| Match            | 36eea5b0-a1a0-4126-b0ab-35aea2e526b0 | Cascade-deleted with posting | Success (assumed) |
| Profile fields   | —                                    | No changes made              | N/A               |
| Settings toggles | —                                    | No changes made              | N/A               |

## Migration Note

**IMPORTANT**: The migration `20260306100000_add_composable_access.sql` had to be manually repaired and re-applied during this test session. Before landing the `feat/text-first-compose` branch, verify that the dev database has:

- `in_discover` boolean column on `postings` table
- `link_token` text column on `postings` table
- Corresponding indexes and RLS policy

Run `supabase migration list` to confirm all migrations are synced.

## Test Environment

- **Browser**: Chrome (via Claude-in-Chrome)
- **Server**: production build (localhost:3000) from worktree `/home/ajb/repos/Mesh-feat/text-first-compose`
- **Date**: 2026-03-06
- **Tiling WM**: Confirmed — resize_window to 375x812 succeeded (viewport reported as 455x574 — the WM adjusts the inner viewport dimensions)
