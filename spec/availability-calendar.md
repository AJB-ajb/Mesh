# Availability & Calendar

## Overview

Three-part feature: (A) minute-level availability windows with overlap matching, (B) external calendar sync, (C) in-posting team scheduling.

---

## Part A — Availability Windows

Replace the coarse morning/afternoon/evening grid with precise time windows. Both profiles and postings can define when they're available.

- **Recurring windows**: Weekly pattern (day + start/end time, minute precision, 15-min snapping in UI)
- **Specific-date windows**: For postings with set dates ("Sat Jan 15, 2-5pm")
- **Quick mode**: Keep the existing 7x3 grid as a convenience input. Grid slots map to fixed time ranges (morning=06:00-12:00, afternoon=12:00-18:00, evening=18:00-24:00). Under the hood, grid clicks create/remove window rows.
- **Detailed mode**: Interactive calendar week view with drag-to-create, resize, move, and delete. 15-min snapping. Shows calendar busy blocks as overlay.
- **Single-day restriction**: Windows cannot span midnight (enforced in UI).
- **Timezone**: Stored per profile and posting (IANA format). Recurring windows stored in local time; specific windows use UTC.

Postings have an `availability_mode`: `flexible` (default, no constraint), `recurring` (weekly windows), or `specific_dates`.

---

## Part B — Calendar Sync

Connect Google Calendar or iCal feeds to import busy blocks. Busy blocks subtract from availability windows to produce effective availability.

- **Google Calendar**: OAuth2 with `calendar.freebusy` scope (free/busy only, no event details). Webhook for real-time sync, polling fallback every 15 min.
- **iCal**: URL-based subscription. Periodic polling every 30 min. Only `DTSTART`/`DTEND` extracted.
- **Effective availability** = available windows minus busy blocks. Computed at query time, not stored.
- **Sync horizon**: 8 weeks ahead by default.
- **Privacy**: Only time ranges stored. No event titles, descriptions, or attendees. OAuth tokens encrypted at rest (pgsodium). Other users never see individual calendar data — only overlap scores and common free windows.

---

## Part C — Team Scheduling

Within an active posting (Activity tab), once minimum team size is reached:

1. System computes common free windows across all team members (recurring windows expanded onto specific dates, minus busy blocks)
2. Posting owner views available slots on a calendar and proposes a meeting time
3. Team members notified — respond available/unavailable
4. Posting owner decides when to confirm (no fixed quorum — owner's judgment)
5. Export confirmed meeting to Google Calendar (API insert or URL fallback) or download .ics

---

## Matching Integration

Replace the hardcoded `availability_score := 1.0` in `compute_match_breakdown`:

- **Canonical week**: Map recurring windows to a 0-10,079 minute scale using PostgreSQL `int4range`
- **Score**: `overlap_minutes / posting_window_minutes` (fraction of posting's time the user covers)
- **Calendar adjustment**: Average busy blocks over 4 weeks, project onto canonical week, subtract from user's windows
- **Hard filter**: Zero overlap excludes the candidate in Stage 1
- **Missing data**: Default 1.0 if either party has no windows defined

---

## AI Extraction

Extend extraction prompts to parse availability from natural language:

- "Weekday evenings" -> Mon-Fri 18:00-24:00
- "This Saturday 2-4pm" -> specific window
- "Mornings except Tuesday" -> Mon, Wed-Sun 06:00-12:00
- "Flexible schedule" -> availability_mode: flexible

Reference points: morning=06:00-12:00, afternoon=12:00-18:00, evening=18:00-24:00, weekdays=Mon-Fri, weekends=Sat-Sun.

---

## Visibility Control

`calendar_visibility` on profiles: `match_only` (default) — calendar data only affects scores; `team_visible` — team members see your free/busy status in scheduling view. No event details exposed in either mode.

---

## Implementation Phases

| Phase | Scope                                                                                          | Target |
| ----- | ---------------------------------------------------------------------------------------------- | ------ |
| 1     | Data model + migration. Quick mode reads/writes new format. Posting `availability_mode`.       | v0.4   |
| 2     | Detailed calendar week view. Posting availability input. Overlap scoring + hard filter.        | v0.4   |
| 3     | Google Calendar OAuth + FreeBusy sync. Busy block overlay. Effective availability in matching. | v1.0   |
| 4     | iCal sync. Calendar settings UI. AI extraction.                                                | v1.0   |
| 5     | Team scheduling: common windows, proposals, calendar export.                                   | v1.0+  |

---

## Open Questions

- **Multiple calendars**: Initial design syncs primary only. Multi-calendar support later.
- **Sync horizon**: 8 weeks. Extend for far-future posting dates?
- **Recurring meetings**: Support "every Tuesday 3pm"? Defer to later version.
