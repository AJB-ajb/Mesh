# Mesh UI Test Report - 2026-02-23

## Summary

- **Branch**: `feat/nl-nav-redesign` (worktree at `/home/ajb/repos/Mesh-feat/nl-nav-redesign`)
- **Mode**: both (flows + visual)
- **Bugs Found**: 3 (0 critical, 0 high, 2 medium, 1 low)
- **Flows Passed**: 11/11
- **Pages Scanned**: 10 (desktop only — mobile viewport emulation not supported by extension)

## Key Feature Changes (vs. flow spec)

The `feat/nl-nav-redesign` branch introduces these intentional UX changes:

1. **Unified NL input + form layout on Create Posting** — replaces the previous AI Extract / Fill Form tab toggle with a single page: NL textarea at top, form fields always visible below
2. **Always-editable postings** — posting detail (owner view) now has Edit/Manage/Project tabs, with the Edit tab reusing the same unified NL + form layout
3. **NL search bar on Discover and My Postings** — new natural language search with mic icon, replaces simple text search
4. **Active page simplified** — no All/Created/Joined tabs, just a flat list
5. **My Postings cards simplified** — only "Edit" button (no Manage/Activity buttons on card)

## Bugs

### BUG-001: Active page missing filter tabs

- **Severity**: medium
- **Category**: functionality
- **Page**: `/active`
- **Viewport**: desktop
- **Description**: The Active page has no All/Created/Joined tabs to filter between created and joined postings
- **Expected**: Tabs to filter between All, Created, and Joined postings
- **Actual**: Only a flat list of active postings with no filtering capability

### BUG-002: My Postings cards missing Manage/Activity buttons

- **Severity**: medium
- **Category**: UX
- **Page**: `/my-postings`
- **Viewport**: desktop
- **Description**: Posting cards on My Postings only show an "Edit" button. No quick access to Manage or Activity views from the card.
- **Expected**: Edit / Manage / Activity buttons on each posting card for quick access
- **Actual**: Only "Edit" button shown; user must click Edit then switch tabs to reach Manage/Project

### BUG-003: Grammar issue in posted time

- **Severity**: low
- **Category**: style
- **Page**: `/my-postings`
- **Viewport**: desktop
- **Description**: Posting time shows "1 weeks ago" instead of "1 week ago"
- **Expected**: "1 week ago" (singular)
- **Actual**: "1 weeks ago" (plural when count is 1)

## Flow Tests

| #   | Flow               | Status | Notes                                                                                                                                                                                                                                                                               |
| --- | ------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Authentication     | PASS   | Already logged in; login page verified after sign-out. Email, password, Sign In, OAuth (Google/GitHub/LinkedIn), Forgot password, Sign up link all present.                                                                                                                         |
| 2   | Sidebar Navigation | PASS   | All 6 nav items work: Discover, My Postings, Active, Connections, Profile, Settings. Header has search, theme toggle, notification bell (with badge), avatar.                                                                                                                       |
| 3   | Create Posting     | PASS   | Design changed: unified NL + form layout (no tabs). All fields present: Title, Description\*, Skills, Tags, Estimated Time, Category, Context, Visibility, Team size, Looking for, Expires on, Auto-accept, Location, Availability. Text entry works.                               |
| 4   | Browse Postings    | PASS   | NL search bar works (filters in real-time). Category chips work (Study filtered correctly, All resets). Posting cards show match %, compatibility breakdown, Request to join / View Details buttons.                                                                                |
| 5   | Posting Detail     | PASS   | Title, status, expiry, match %, description, skills, tags, info cards (team size, time, category, location), compatibility section (100% match), Posting Creator sidebar with Contact Creator, Actions (Share, Report), Request to join button. Loading spinner shown during fetch. |
| 6   | My Postings        | PASS   | Heading, NL search bar, category chips, filter icon, + New Posting. Cards show Edit button only (BUG-002).                                                                                                                                                                          |
| 7   | Active Postings    | PASS\* | Page loads with posting cards, "You created"/"You joined" badges, "open" status. \*Missing All/Created/Joined tabs (BUG-001).                                                                                                                                                       |
| 8   | Connections        | PASS   | Split-pane layout, search bar, connection list (with online indicator), + Add button, QR/share icons. Right pane shows "Select a connection to start chatting" empty state.                                                                                                         |
| 9   | Profile            | PASS   | "Your Profile" heading, email, Edit Profile button, GitHub Profile Enrichment card, Quick Update (AI) with "What changed?" field, General Information (name, headline, about, location, languages).                                                                                 |
| 10  | Settings           | PASS   | Account (email, type), Connected Accounts (Google connected, GitHub/LinkedIn not connected), Calendar Sync, Notification Preferences (In-App/Browser toggles for Interest Received, Join Request Accepted/Declined, Connection Request).                                            |
| 11  | Sign Out           | PASS   | Avatar dropdown shows Profile, Settings, Sign out. Sign out redirects to /login. Protected route /active redirects to /login?next=%2Factive. Re-login works and redirects to /active.                                                                                               |

## Pages Tested

| Page                    | Route                     | Desktop | Mobile | Notes                                                             |
| ----------------------- | ------------------------- | ------- | ------ | ----------------------------------------------------------------- |
| Login                   | `/login`                  | PASS    | N/A    | Clean centered card, dark theme, OAuth buttons                    |
| Discover                | `/discover`               | PASS    | N/A    | NL search bar, category chips, posting cards with match %         |
| My Postings             | `/my-postings`            | PASS    | N/A    | NL search bar, Edit-only cards (BUG-002), "1 weeks ago" (BUG-003) |
| Active                  | `/active`                 | PASS\*  | N/A    | Missing filter tabs (BUG-001)                                     |
| Connections             | `/connections`            | PASS    | N/A    | Split-pane, online indicators, empty state                        |
| New Posting             | `/postings/new`           | PASS    | N/A    | Unified NL + form layout, all fields present                      |
| Posting Detail (viewer) | `/postings/[id]`          | PASS    | N/A    | Full detail with compatibility section                            |
| Posting Detail (owner)  | `/postings/[id]?tab=edit` | PASS    | N/A    | Edit/Manage/Project tabs, always-editable NL + form               |
| Profile                 | `/profile`                | PASS    | N/A    | GitHub enrichment, Quick Update AI                                |
| Settings                | `/settings`               | PASS    | N/A    | Account, Connected Accounts, Calendar Sync, Notifications         |

## Notes

- **Mobile testing skipped**: The Claude-in-Chrome extension's `resize_window` tool does not effectively change the CSS viewport (inner width remained 1790px regardless of window resize). Mobile responsive testing requires manual browser DevTools.
- **Test user**: Tested with both ajb60722@gmail.com (initial session) and ajb60721@gmail.com (re-login after sign-out).
- **Dev server**: Running from worktree at `/home/ajb/repos/Mesh-feat/nl-nav-redesign` on `feat/nl-nav-redesign` branch.
