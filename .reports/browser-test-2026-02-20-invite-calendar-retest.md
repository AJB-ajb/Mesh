# Mesh UI Test Report - 2026-02-20 (Invite & Calendar Retest)

## Summary

- **Mode**: flows (multi-user invite + calendar retest)
- **Bugs Found**: 4 new (1 critical, 2 high, 1 medium) + 6 previous bugs verified fixed
- **Users Tested**: User 1 (ajb60721@gmail.com / Alexander Busch), User 2 (ajb60722@gmail.com / Test User)
- **Focus**: Regression testing of BUG-001 through BUG-008 fixes, calendar/scheduling features, multi-user invite flows

## Previous Bug Fix Verification

| Bug     | Title                                                     | Status              | Notes                                                                                                                   |
| ------- | --------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| BUG-001 | Cannot create new invite after cancelling                 | **FIXED**           | Invite creation UI (mode toggle, connection selector) now shown below cancelled invite status                           |
| BUG-002 | Non-owner members cannot see Project section              | **PARTIALLY FIXED** | Team Members + Team Chat visible, but Team Scheduling (calendar, meetings) still hidden for non-owner. See NEW-BUG-002. |
| BUG-003 | Private postings visible on Discover feed                 | **FIXED**           | Private posting "Classical Concert Today" not visible on Discover for either user                                       |
| BUG-004 | Private badge missing on posting detail page              | **FIXED**           | "Private" badge now visible in header for both owner and non-owner views                                                |
| BUG-005 | Tab URL parameter not synced when switching tabs          | **FIXED**           | Edit -> `?tab=edit`, Manage -> `?tab=manage`, Project -> `?tab=project` all update correctly                            |
| BUG-007 | Response card says "Sequential Invite" regardless of mode | **FIXED**           | Now says generic "This posting uses Invite — the poster will invite connections directly."                              |
| BUG-008 | Notification unread count HEAD request returns 503        | **FIXED**           | Switched from HEAD to GET with `limit=0`, both return 200 OK                                                            |

## New Bugs

### NEW-BUG-001: Team Members section shows wrong data for non-owner view

- **Severity**: critical
- **Category**: functionality
- **Page**: /postings/[id] (non-owner accepted member view)
- **Viewport**: both
- **Description**: When User 2 (Test User, an accepted member) views the posting detail, the Team Members section shows "1 / min 1 (max 2)" with only Alexander Busch (Owner) listed and the text "No members have joined yet." This is factually wrong — User 2 IS an accepted member.
- **Expected**: Should show "2 / min 1 (max 2)" with both Alexander Busch (Owner) and Test User (Joined) listed.
- **Actual**: Only shows owner and claims no members have joined.
- **Root Cause**: Likely the non-owner query for applications/members doesn't return the full accepted members list. The fix for BUG-002 made the section visible but didn't fix the underlying data fetch for non-owners.

### NEW-BUG-002: Team Scheduling not visible for non-owner accepted members

- **Severity**: high
- **Category**: functionality
- **Page**: /postings/[id] (non-owner accepted member view)
- **Viewport**: both
- **Description**: The owner view of the Project tab shows Team Members, then Team Scheduling (Common Availability calendar + Meeting Proposals with "+ Propose Meeting" button). The non-owner accepted member view shows Team Members then Team Chat, but NO Team Scheduling section at all.
- **Expected**: Accepted members should see Common Availability and Meeting Proposals so they can view team scheduling, respond to proposals, and see when meetings are planned.
- **Actual**: Team Scheduling section is entirely absent from the non-owner view.

### NEW-BUG-003: Maximum update depth exceeded in GroupChatPanel

- **Severity**: high
- **Category**: functionality
- **Page**: /postings/[id] (non-owner view with Team Chat)
- **Viewport**: both
- **Description**: Next.js console error: "Maximum update depth exceeded. This can happen when a component calls setState inside useEffect, but useEffect either doesn't have a dependency array, or one of the dependencies changes on every render."
- **File**: `src/components/posting/group-chat-panel.tsx:91:5`
- **Code**: `useEffect(() => { setLocalMessages(fetchedMessages); }, [fetchedMessages]);`
- **Root Cause**: `fetchedMessages` from SWR creates a new array reference on every render, triggering the effect, which calls `setLocalMessages`, which causes a re-render, creating an infinite loop.
- **Fix**: Use a stable comparison (e.g., compare JSON stringified or use a ref to track previous value), or remove the local state sync and use `fetchedMessages` directly.

### NEW-BUG-004: Private postings still accessible via direct URL

- **Severity**: medium
- **Category**: functionality / security
- **Page**: /postings/[id] (private posting, non-invited user)
- **Viewport**: both
- **Description**: BUG-003 fix hides private postings from the Discover feed, but a non-invited user can still access the full posting by navigating directly to `/postings/[id]`. The posting description, tags, compatibility score, creator info, and all metadata are fully exposed.
- **Expected**: Private/friend-ask postings should return a 403 or redirect for users who are not the owner or an explicit invitee.
- **Actual**: Full posting content is accessible to any authenticated user with the URL.

## Calendar Feature Tests (User 1 — Owner)

| Feature                               | Status            | Notes                                                                      |
| ------------------------------------- | ----------------- | -------------------------------------------------------------------------- |
| Project tab visible                   | PASS              | Tab enabled when min team size met (1 accepted member)                     |
| Team Members section                  | PASS              | Shows 2 / min 1 (max 2) with both members listed correctly                 |
| Common Availability calendar          | PASS              | Week view with blocked slots on Tuesday in red                             |
| Calendar color semantics (Bug #1 fix) | PASS (likely)     | Red blocks appear to represent unavailable/blocked time — correct behavior |
| "+ Propose Meeting" button            | PASS              | Visible in Meeting Proposals section                                       |
| Meeting proposal card                 | PASS              | "Kickoff Meeting" — Mi., 25. Feb., 14:00, 1h — "Confirmed" status          |
| "Add to Google Calendar" button       | PASS              | Present with correct URL                                                   |
| "Download .ics" button                | PASS              | Present with correct API endpoint                                          |
| Meeting response counts (Bug #3)      | **STILL MISSING** | No response count indicator on proposal cards (e.g., "0/2 available")      |

## Calendar Feature Tests (User 2 — Joined Member)

| Feature                 | Status          | Notes                                                  |
| ----------------------- | --------------- | ------------------------------------------------------ |
| Team Scheduling section | **NOT VISIBLE** | See NEW-BUG-002 — entire section missing for non-owner |
| Common Availability     | **NOT VISIBLE** | Hidden because Team Scheduling is hidden               |
| Meeting Proposals       | **NOT VISIBLE** | Hidden because Team Scheduling is hidden               |
| Team Chat               | PASS            | Visible, connected, shows messages from owner          |

## Design Decision: Unify Team Size Metric

**Goal**: The "team size" metric must have a single, consistent meaning across the entire platform — it **always includes the owner/creator**.

**Current problem**: Team size is inconsistently counted. In some places the creator is excluded (e.g., Active page card shows "1 / min 1 (max 2)" when there are 2 actual members), while in others it's ambiguous. This leads to confusion about how many people are on the team and whether the posting still needs members.

**Required changes**:

- **Minimum team size selectable must be 2** (creator + at least 1 other person). A team of 1 is just the creator alone and shouldn't be selectable.
- **All display counts include the creator**: Active page cards, posting detail Team Members header, Discover cards — everywhere team size is shown.
- **All queries/RPCs that compute team size must count the creator** as a team member.
- **Surfaces affected**: posting creation form (min/max selectors), Active page cards, posting detail Team Members section, Discover card metadata, any API that returns team size or accepted count.

**Example**: A posting with min 2 / max 4, where the creator + 1 accepted member exist, should display "2 / min 2 (max 4)" everywhere.

## UX Irritations

### IRR-001: No "Express Interest" action for non-invited viewers of private postings (STILL PRESENT)

- Non-invited users seeing a private posting (via direct URL) have no actionable next step beyond "Contact Creator".
- **Suggestion**: Add a "Request to be Invited" action, or block access entirely (see NEW-BUG-004).

### IRR-002: Member count on Active page excludes creator (STILL PRESENT)

- Active page shows "1 / min 1 (max 2)" for a posting with 2 actual team members (creator + 1 joined).
- The count appears to only count non-creator accepted members, which is confusing.
- **Blocked by**: Design Decision above — once team size is unified to always include owner, this resolves automatically.

### IRR-003: Cancelled invite shows only name with no timestamps or context (STILL PRESENT)

- The cancelled invite timeline shows "Wilson" with "This invite was cancelled" but no timestamps or cancellation reason.

### IRR-004: Missing "Start Invite" button in invite creation UI (NEW)

- After a cancelled invite, the Invite Connections card shows the mode toggle (Sequential/Parallel) and "Add connections" with Wilson listed, but no visible "Start Invite" submit button.
- The creation UI is present (BUG-001 fix works), but it's unclear how to submit a new invite.
- May require selecting a connection first for the button to appear.

### IRR-005: Team Chat shows "1 member" but there are 2 team members (NEW)

- Team Chat header says "1 member" while Team Members section (even with its bugs) shows the owner.
- If there are 2 team members, the chat member count should reflect that.
- **Related to**: Design Decision above — part of the unified team size metric fix.

## Flow Tests

| #   | Flow                                    | Status  | Notes                                                                                                |
| --- | --------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Login (User 1)                          | PASS    | Redirected to /active                                                                                |
| 2   | Login (User 2)                          | PASS    | Redirected to /active                                                                                |
| 3   | User 1: My Postings                     | PASS    | Shows 3+ postings including private "Classical Concert Today"                                        |
| 4   | User 1: Private posting detail          | PASS    | Private badge visible, invite in progress (Wilson), BUG-004/BUG-005 fixed                            |
| 5   | User 1: Invite card (cancelled posting) | PASS    | BUG-001 fixed — creation UI shown below cancelled status                                             |
| 6   | User 1: Project tab (owner)             | PASS    | Team Members, Common Availability, Meeting Proposals all visible                                     |
| 7   | User 1: Discover (private hidden)       | PASS    | BUG-003 fixed — private posting not shown                                                            |
| 8   | User 1: Notifications                   | PASS    | No red badge (no unread), BUG-008 fixed                                                              |
| 9   | User 2: Active page                     | PASS    | Shows "You joined" badge correctly                                                                   |
| 10  | User 2: Posting detail (joined member)  | PARTIAL | Team Members + Team Chat visible but data wrong (NEW-BUG-001), Team Scheduling missing (NEW-BUG-002) |
| 11  | User 2: Private posting (direct URL)    | FAIL    | Full content accessible — should be blocked (NEW-BUG-004)                                            |
| 12  | User 2: Private posting badges/labels   | PASS    | BUG-004 + BUG-007 both fixed                                                                         |
| 13  | User 2: Discover (private hidden)       | PASS    | Private posting not shown                                                                            |
| 14  | User 2: Notifications                   | PASS    | 3 unread, badge count correct                                                                        |
| 15  | User 2: Team Chat                       | PARTIAL | Renders and shows messages, but has infinite loop error (NEW-BUG-003)                                |

## Pages Tested

| Page                                  | Route                      | User 1 | User 2  | Notes                                             |
| ------------------------------------- | -------------------------- | ------ | ------- | ------------------------------------------------- |
| Login                                 | /login                     | PASS   | PASS    | Both users                                        |
| Active                                | /active                    | PASS   | PASS    | Role badges correct                               |
| My Postings                           | /my-postings               | PASS   | -       | Private badge visible on cards                    |
| Posting Detail (owner, Manage)        | /postings/[id]?tab=manage  | PASS   | -       | Join requests, invite card, matched collaborators |
| Posting Detail (owner, Project)       | /postings/[id]?tab=project | PASS   | -       | Full scheduling visible                           |
| Posting Detail (member)               | /postings/[id]             | -      | PARTIAL | NEW-BUG-001, NEW-BUG-002, NEW-BUG-003             |
| Posting Detail (private, non-invited) | /postings/[id]             | -      | FAIL    | NEW-BUG-004, accessible via direct URL            |
| Discover                              | /discover                  | PASS   | PASS    | Private postings hidden                           |
