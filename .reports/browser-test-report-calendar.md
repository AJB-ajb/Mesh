# Browser Test Report: Calendar Features (Phases 1-5)

**Date:** 2026-02-20
**Tester:** Claude (automated browser testing via Claude-in-Chrome)
**App:** Mesh (localhost:3000)
**User:** ajb60721@gmail.com (Alexander Busch)

## Summary

All calendar features across phases 1-5 were tested via browser automation. Core functionality works correctly. Three UX issues were identified, one of which is being fixed immediately.

## Test Results

### Phase 1-2: Profile & Posting Availability

| Feature                        | Status | Notes                                          |
| ------------------------------ | ------ | ---------------------------------------------- |
| Quick mode grid (7×4)          | PASS   | Toggle on/off works, cells highlight red       |
| Quick ↔ Detailed mode switch   | PASS   |                                                |
| Detailed calendar week view    | PASS   | 7-day × 24-hour grid renders correctly         |
| Drag-to-create block           | PASS   | Creates block with time label, 15-min snapping |
| Drag-to-move block             | PASS   | Preserves duration, snaps to new position      |
| Delete block (X button)        | PASS   |                                                |
| Posting: Flexible mode         | PASS   | No calendar shown                              |
| Posting: Recurring weekly mode | PASS   | Shows Quick/Detailed grid                      |
| Posting: Specific dates mode   | PASS   | "Coming soon" placeholder                      |

### Phase 3-4: Calendar Sync Settings

| Feature                        | Status     | Notes                               |
| ------------------------------ | ---------- | ----------------------------------- |
| Calendar Sync card             | PASS       | Renders with Google + iCal sections |
| Connect Google Calendar button | PASS       | Links to OAuth endpoint             |
| iCal URL input + Add button    | PASS       |                                     |
| iCal invalid URL validation    | PASS       | Shows error for non-http(s) URLs    |
| Visibility toggle              | PASS       | Only shows when connections > 0     |
| Google OAuth flow              | NOT TESTED | Requires live Google credentials    |

### Phase 5: Team Scheduling

| Feature                            | Status            | Notes                                 |
| ---------------------------------- | ----------------- | ------------------------------------- |
| Team Scheduling section visibility | PASS              | Shows when min team size met          |
| Common Availability view           | PASS (visual bug) | See Bug #1 below                      |
| "+ Propose Meeting" button         | PASS              |                                       |
| Meeting proposer form              | PASS              | Title, datetime, duration inputs work |
| Proposal creation                  | PASS              | Creates card with "Proposed" badge    |
| Confirm meeting                    | PASS              | Status changes to "Confirmed"         |
| Export: "Add to Google Calendar"   | PASS              | Link present with correct URL         |
| Export: "Download .ics"            | PASS              | Correct API endpoint, auth-protected  |

## Bugs Found

### Bug #1: Common Availability uses wrong color semantics [FIXING]

**Severity:** Medium (UX confusion)
**Location:** Team Scheduling > Common Availability view
**Description:** The common availability calendar shows AVAILABLE time as red blocks. Red is used throughout the app to mean "unavailable/blocked." Users expect red = blocked and empty = available, so they can click on empty slots to propose meetings.
**Root cause:** `get_team_common_availability` RPC returns available windows, which are passed to `CalendarWeekView` and rendered with `destructive` (red) styling via `CalendarWeekViewBlock`.
**Fix:** Invert the windows in `TeamAvailabilityView` so that unavailable time is shown as red blocks and available time is clear.

### Bug #2: Profile edit form may not pre-load saved availability windows

**Severity:** Medium (data loss risk)
**Location:** Profile > Edit Profile > Availability section
**Description:** The read-only profile view showed colored cells in the availability quick grid, but when entering edit mode, all cells appeared unselected/gray. If previously saved availability data isn't loaded into the edit form, users might unknowingly overwrite their settings when saving.
**Steps to reproduce:**

1. Navigate to Profile (read-only view)
2. Observe colored cells in availability grid
3. Click "Edit Profile"
4. Scroll to Availability section — all cells are gray/unselected
   **Expected:** Edit form should pre-populate with the user's saved availability windows.
   **Note:** Needs further investigation — the view page cells might be showing calendar busy blocks (read-only) rather than manually-set windows, in which case the edit form correctly shows no manual windows.

### Bug #3: No response counts on meeting proposal cards

**Severity:** Low (missing information)
**Location:** Team Scheduling > Meeting Proposals
**Description:** Meeting proposal cards don't show the count of available/unavailable responses from team members. The spec calls for showing response counts so the owner can gauge team availability before confirming.
**Steps to reproduce:**

1. Navigate to an active posting's Project tab
2. Propose a meeting
3. Observe the proposal card — no response count indicator visible
   **Expected:** Card should show something like "0/2 available" or "Responses: 0 available, 0 unavailable" even as a zero state.
