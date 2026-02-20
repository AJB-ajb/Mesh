# Mesh UI Test Report - 2026-02-20

## Summary

- **Mode**: flows (multi-user invite focus)
- **Bugs Found**: 8 (2 critical, 3 high, 2 medium, 1 low)
- **Users Tested**: User 1 (ajb60721@gmail.com / Alexander Busch, posting creator), User 2 (ajb60722@gmail.com / Test User, joined member)
- **Focus**: Sequential invite features, multi-user flows, private posting visibility

## Bugs

### BUG-001: Cannot create new invite after cancelling

- **Severity**: critical
- **Category**: functionality
- **Page**: /postings/[id]?tab=manage
- **Viewport**: both
- **Description**: After a creator cancels an invite, the "Invite Connections" card permanently shows the cancelled invite status. There is no way to start a new invite for the same posting.
- **Expected**: After cancelling, the card should either show the creation UI again (mode toggle, connection selector, Start Invite button) or have a "New Invite" button to reset.
- **Actual**: The card displays "Invite Progress — Cancelled" with the old invite timeline and no way to proceed.
- **Root Cause**: `useSequentialInviteForPosting` (use-sequential-invites.ts:32-43) returns cancelled/completed invites as a fallback. The card component (sequential-invite-card.tsx:161) checks `if (sequentialInvite)` which is truthy for cancelled invites, so it shows status view instead of creation UI.
- **Fix**: Either filter out cancelled/completed invites in the hook, or add a condition in the card to show creation UI when `sequentialInvite.status === "cancelled" || sequentialInvite.status === "completed"`.

### BUG-002: Non-owner members cannot see Project section (team chat, scheduling)

- **Severity**: critical
- **Category**: functionality
- **Page**: /postings/[id]
- **Viewport**: both
- **Description**: A user who has been accepted onto a posting (via join request or invite) cannot see the Project section containing Team Members, Team Chat, Common Availability calendar, or Meeting Proposals.
- **Expected**: Accepted members should see team chat, scheduling, and team member information, matching what the posting creator sees on the Project tab.
- **Actual**: The accepted member only sees the "About this posting" and "Your Compatibility" cards. No team or project content is rendered.
- **Root Cause**: `use-posting-detail.ts` only fetches the current user's own application for non-owners (line 176-180), leaving the `applications` array empty. The page component computes `acceptedCount = effectiveApplications.filter(a => a.status === "accepted").length` which evaluates to 0. Then `projectEnabled = (0 >= team_size_min)` is false, so the project section is never rendered.
- **Fix**: For non-owners, also fetch the count of accepted applications for the posting (or at least the accepted count), so `projectEnabled` can be computed correctly.

### BUG-003: Private postings visible on Discover feed

- **Severity**: high
- **Category**: functionality
- **Page**: /discover
- **Viewport**: both
- **Description**: Postings with `visibility: "private"` (friend-ask mode) appear in the public Discover feed, fully visible to all authenticated users. The posting's description, tags, compatibility breakdown, team size, and creator are all exposed.
- **Expected**: Private postings should not appear in Discover at all. They should only be visible to explicitly invited connections.
- **Actual**: Private postings show up in Discover with a "Private" badge but all content visible. Any user can click "View Details" and see the full posting detail page.
- **Fix**: Filter out `visibility = 'private'` (or `mode = 'friend_ask'`) postings from the Discover query.

### BUG-004: Private badge missing on posting detail page

- **Severity**: medium
- **Category**: UX
- **Page**: /postings/[id] (for private postings)
- **Viewport**: both
- **Description**: On the Discover page, private postings show a "Private" badge next to the category. On the posting detail page, this badge is absent — only the "open" status badge is shown.
- **Expected**: The "Private" badge should also appear on the detail page header so users understand the posting's access model.
- **Actual**: The detail page header shows only "open" and expiry date, with no private indicator.

### BUG-005: Tab URL parameter not synced when switching tabs

- **Severity**: medium
- **Category**: UX
- **Page**: /postings/[id]
- **Viewport**: both
- **Description**: When the posting creator switches between Edit/Manage/Project tabs, the URL `?tab=` parameter does not update to reflect the active tab.
- **Expected**: Clicking the "Manage" tab should update the URL to `?tab=manage` so the state is shareable and survives page refresh.
- **Actual**: The URL retains the original `?tab=project` value even after clicking on the Manage tab. Refreshing the page returns to the Project tab, not Manage.

### BUG-006: Response card hardcoded strings violate i18n convention

- **Severity**: low
- **Category**: style
- **Page**: /postings/[id] (non-owner view on private postings)
- **Viewport**: both
- **Description**: `sequential-invite-response-card.tsx` contains 5+ hardcoded English strings instead of using `labels` from `@/lib/labels.ts`.
- **Strings**: "You've been invited!", "The posting creator has invited you to join. Would you like to accept?", "Join", "Do not join", "You joined this posting!", "You declined this invite.", "This posting uses Sequential Invite — the poster will invite connections directly."
- **Expected**: All user-facing strings should reference `labels.invite.*` keys per `.AGENTS.md` i18n conventions.

### BUG-007: Response card says "Sequential Invite" regardless of mode

- **Severity**: high
- **Category**: UX
- **Page**: /postings/[id] (non-owner, not-invited state)
- **Viewport**: both
- **Description**: The `not_invited` state in `SequentialInviteResponseCard` displays "This posting uses Sequential Invite — the poster will invite connections directly." even when the posting uses parallel invite mode.
- **Expected**: The message should reflect the actual invite mode or use a generic term like "Invite".
- **Actual**: Always says "Sequential Invite" regardless of mode.

### BUG-008: Notification unread count HEAD request returns 503

- **Severity**: high
- **Category**: functionality
- **Page**: All authenticated pages
- **Viewport**: both
- **Description**: The `HEAD` request to count unread notifications (`notifications?read=eq.false`) returns HTTP 503 (Service Unavailable).
- **Expected**: The HEAD request should return 200 with a count header.
- **Actual**: Returns 503. This may cause the notification badge count to be incorrect or missing (though a fallback GET request at request #6 does succeed).

## UX Irritations (non-bug)

### IRR-001: No "Request to Join" action visible for private postings

- Non-invited users seeing a private posting have no actionable next step. The card says the poster will invite directly, but there's no way to express interest.
- **Suggestion**: Add a "Request to be Invited" or "Express Interest" action so non-invited viewers aren't stuck.

### IRR-002: Cancelled invite shows only user ID / name with no context

- The cancelled invite timeline shows "1 Wilson" but no additional context like when the invite was created, when it was cancelled, or why.
- **Suggestion**: Add timestamps and possibly a note about why cancellation happened.

### IRR-003: Joined member posting card shows "1 / min 1 (max 2)" instead of actual team size

- On the Active page, Test User sees "1 / min 1 (max 2)" for a posting where there are 2 team members (creator + joined member). The count seems to exclude the creator.
- **Suggestion**: Clarify whether the count includes the creator, or display "2 members (of 2 max)".

## Flow Tests

| #   | Flow                             | Status | Notes                                                                               |
| --- | -------------------------------- | ------ | ----------------------------------------------------------------------------------- |
| 1   | Login (User 1)                   | PASS   | Redirected to /active                                                               |
| 2   | Login (User 2)                   | PASS   | Redirected to /active                                                               |
| 3   | User 1: Navigate to Manage tab   | PASS   | Tab visible, content loads                                                          |
| 4   | User 1: Invite card (creator)    | FAIL   | BUG-001: Cancelled invite blocks new invite creation                                |
| 5   | User 1: Invite status display    | PASS   | Cancelled status shown correctly with timeline                                      |
| 6   | User 1: Notifications            | PASS   | No sequential_invite notifications (expected — invite was to Wilson, not Test User) |
| 7   | User 2: Active page              | PASS   | Shows joined posting                                                                |
| 8   | User 2: Posting detail (joined)  | FAIL   | BUG-002: No project section visible (team chat, scheduling)                         |
| 9   | User 2: Discover private posting | FAIL   | BUG-003: Private posting visible to all users                                       |
| 10  | User 2: Private posting detail   | FAIL   | BUG-004: No "Private" badge, BUG-007: Wrong invite mode label                       |
| 11  | User 2: Notifications            | PASS   | 3 notifications displayed correctly                                                 |

## Pages Tested

| Page                                  | Route                     | Desktop       | Mobile | Notes            |
| ------------------------------------- | ------------------------- | ------------- | ------ | ---------------- |
| Active                                | /active                   | PASS          | -      | Both users       |
| Posting Detail (owner)                | /postings/[id]?tab=manage | PASS (visual) | -      | BUG-001, BUG-005 |
| Posting Detail (member)               | /postings/[id]            | FAIL          | -      | BUG-002          |
| Discover                              | /discover                 | FAIL          | -      | BUG-003          |
| Posting Detail (private, non-invited) | /postings/[id]            | FAIL          | -      | BUG-004, BUG-007 |
| Login                                 | /login                    | PASS          | -      | Both users       |
