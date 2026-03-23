# Open Concerns

Deferred issues from critreviews and code reviews that are out of scope for the originating PR but should be addressed. Each entry has enough context for a future agent session to pick it up independently.

When resolving a concern, delete the entry (don't comment it out or mark it done — this file should only contain open items).

---

## Calendar integration: tentative status not set

**Source**: critreview on `feat/time-proposal-enhancements` (2026-03-23)
**Severity**: Medium
**Area**: `src/lib/cards/calendar-integration.ts`, `src/lib/calendar/google.ts`

When a user commits to a resolved time proposal as "Maybe," the Google Calendar event is created as **confirmed** instead of **tentative**. The `tentative` parameter in `createEventForUser` only appends text to the event description — it doesn't set the Google Calendar API's `status` field to `"tentative"`.

**Fix**: `createCalendarEvent` in `src/lib/calendar/google.ts` needs to accept an optional `status` parameter (`"confirmed" | "tentative"`) and pass it to the Google Calendar API's event resource. Then `createEventForUser` passes `status: "tentative"` when `tentative === true`.

---

## Calendar integration: no event ID tracking, undo creates orphan events

**Source**: critreview on `feat/time-proposal-enhancements` (2026-03-23)
**Severity**: Medium
**Area**: `src/lib/cards/calendar-integration.ts`, `src/app/api/spaces/[id]/cards/[cardId]/commit/route.ts`

When a time proposal auto-resolves, calendar events are created for winning voters, but the Google Calendar event IDs are not stored anywhere. This means:

1. **Undo leaves orphan events**: If a user clicks "Undo" (commits as `cant_make_it`), the commitment record updates but the calendar event remains on their Google Calendar.
2. **Re-commit creates duplicates**: If a user undoes and then re-adds, a second calendar event is created.

**Fix**: Store Google Calendar event IDs in the card's `commitments` data (e.g., `{ "user-id": { commitment: "attending", calendar_event_id: "abc123" } }`). On undo (`cant_make_it`), call the Google Calendar delete API. On re-commit, check if an event already exists before creating a new one.

This requires restructuring the `commitments` field from `Record<string, string>` to `Record<string, { commitment: string; calendar_event_id?: string }>`, which is a breaking data shape change — use an expand-contract migration pattern.
