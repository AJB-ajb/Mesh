# Scheduling Intelligence

> Scheduling intelligence — smart time slot generation, user scheduling preferences, and group coordination. Builds on [1-availability.md](1-availability.md).

---

## Overview

Scheduling intelligence sits between raw calendar data and the user-facing acceptance card. It transforms "both people are free 14:00–18:00" into "here are 3 thoughtful time slots that account for your commute, preferences, and the nature of the activity."

Three layers:

1. **Calendar overlap** (deterministic) — intersection of free windows
2. **Scheduling preferences** (user-authored text) — private constraints the LLM incorporates
3. **Context-aware slot generation** (LLM) — picks the best times considering activity type, travel, daylight, and social norms

---

## 1. Scheduling Preferences

### What they are

A private, free-form text field on each user's profile where they describe how they like to schedule their day. Never shown to other users. Read by the LLM when generating time slot suggestions.

### Data model

```
profiles:
  scheduling_preferences: text  -- nullable, free-form, private
```

No schema changes to calendars, availability, or postings. The LLM receives this as additional context.

### Privacy

- **Never visible** to other users, not even team members
- **Never used** for matching or ranking — this is purely for scheduling quality
- **Never stored** in any public-facing data — only fed to the LLM at slot generation time
- **Deletable** — user can clear it at any time

### Examples

```
I prefer mornings for deep work, don't schedule anything before 10am
unless it's urgent.

I need at least 30 min between activities to decompress.

After lunch (12-13:30) I'm usually sluggish — nothing requiring energy.

I commute from Pasing — add 30 min travel time for anything in the
city center.

Fridays are my creative day, I don't like structured activities.
```

```
I'm a night owl. Anything before 11am is painful.
I'm based in Garching — add 40 min for central Munich.
I like to batch social things — if I'm already out, stack events.
```

```
I work shifts: Mon/Wed/Fri 6-14, Tue/Thu 14-22.
I need 1 hour transition time after work before social activities.
My partner and I share a car — I can only drive on days I have it.
```

### What the LLM does with preferences

The LLM reads scheduling preferences as soft constraints, not hard rules. It uses them to:

- **Adjust slot start times** for travel (commute from Garching → add 40 min)
- **Add buffers** between activities (30 min decompression → don't suggest tennis ending 5 min before a dinner)
- **Filter inappropriate times** (no 9am social events for someone who says "nothing before 10am")
- **Explain its reasoning** ("Accounts for your travel from Schwabing")

Preferences interact with calendar data:

- Calendar says "free 14:00–18:00" — hard constraint
- Preferences say "need 30 min buffer" — the LLM trims the window to 14:30–17:30 effectively
- The result is a smaller but more realistic set of options

---

## 2. Time Slot Generation

### Architecture

```
┌──────────────────────────────────────────────────────┐
│  Input                                                │
│  ├── Posting text + extracted metadata                │
│  ├── Poster's calendar + scheduling preferences       │
│  ├── Candidate's calendar + scheduling preferences    │
│  ├── Current time, date, season                       │
│  └── Candidate's next calendar event (if relevant)    │
│                                                       │
│  Step 1: Calendar Overlap (deterministic)             │
│  └── Intersect free windows → raw overlap             │
│                                                       │
│  Step 2: LLM Slot Generation (contextual)             │
│  └── From raw overlap, generate 2–5 smart slots       │
│                                                       │
│  Output                                               │
│  ├── Time slots (start + end) for the acceptance card │
│  ├── Brief explanation per slot (optional)             │
│  └── Warnings (late arrival, tight buffer, etc.)      │
└──────────────────────────────────────────────────────┘
```

### Step 1: Calendar overlap (deterministic, no LLM)

```
poster_free     = poster_calendar_free ∩ posting_time_window
candidate_free  = candidate_calendar_free ∩ posting_time_window
mutual_overlap  = poster_free ∩ candidate_free
```

For group postings:

```
mutual_overlap  = poster_free ∩ candidate_1_free ∩ ... ∩ candidate_N_free
```

### Step 2: Duration inference

The LLM estimates activity duration from the posting text.

| Signal                     | Duration    | Source              |
| -------------------------- | ----------- | ------------------- |
| "for about 2 hours"        | 120 min     | Explicit in text    |
| "quick coffee"             | 30–45 min   | Activity + modifier |
| "tennis"                   | 60–90 min   | Activity type       |
| "film shoot all day"       | 6–8 hours   | Activity + explicit |
| "pair programming session" | 2–3 hours   | Activity type       |
| "dinner"                   | 2–2.5 hours | Activity type       |
| "phone call"               | 15–30 min   | Activity type       |
| No signal                  | 60 min      | Default             |

### Step 3: LLM generates slots

The LLM receives:

- Posting text (full)
- Mutual overlap windows (from Step 1)
- Inferred duration (from Step 2)
- Both parties' scheduling preferences
- Current time and date
- Context: season (for daylight), weather (if outdoor), activity type

The LLM produces:

- 2–5 time slots (start + end)
- Optional: brief label or explanation per slot
- Warnings: late arrival, tight buffer, short overlap

### Context-aware filtering

The LLM applies common-sense rules based on activity type:

| Overlap available | Activity        | LLM behavior                             |
| ----------------- | --------------- | ---------------------------------------- |
| 05:00–07:00       | Tennis          | Filters out — too early for casual sport |
| 05:00–07:00       | Morning jog     | Suggests it — appropriate                |
| 22:00–00:00       | Study group     | Suggests it — valid for students         |
| 22:00–00:00       | Hiking          | Filters out — dark, unsafe               |
| 12:00–13:00       | Coffee          | Suggests it — normal                     |
| 12:00–13:00       | 3-hour workshop | Filters out — overlap too short          |

### The specific-time shortcut

When the poster specifies an exact time ("at 3pm"), no time picker is shown. The acceptance card confirms:

```
📅 Today at 15:00 (~90 min)
✅ You're free at this time
            [Confirm & Join]
```

If the candidate is busy at the specified time:

- **Hard conflict**: auto-skip during invite phase
- **Soft conflict**: show warning: "⚠️ You have 'Team standup' at 15:00. [Join anyway] [Suggest another time]"

### Slot presentation rules

- **2–5 slots**: enough choice without overwhelming. 3 is the sweet spot.
- **Evenly distributed**: if overlap is 14:00–18:00, don't show three slots starting at 14:00, 14:15, 14:30.
- **15-minute boundaries**: round to quarter-hours for clean display.
- **Travel buffer**: if scheduling preferences mention commute time, the first slot starts after the commute window, not at the raw overlap start.
- **Context explanation**: show a brief line explaining why these times were chosen when non-obvious constraints are at play ("Accounts for your travel from Schwabing and buffer before your 19:00 dinner").

---

## 3. Group Scheduling

### The N-way problem

Group coordination is harder than 1-on-1 because:

- N-way calendar overlap shrinks fast
- Each person has different scheduling preferences
- Not everyone can always make the same time
- The poster needs to balance "ideal time" vs. "maximum attendance"

### Flow: Poster-mediated scheduling

The poster makes the time decision, not the group. This prevents multi-round negotiation.

```
1. Poster selects invitees
2. System checks calendars, auto-skips busy people
3. System pre-computes best N-way overlap
4. System shows poster the recommended time + any trade-offs
5. Poster confirms or adjusts
6. Invites go out with a SPECIFIC time
7. Each invitee confirms or declines (one tap)
```

### Pre-invite recommendation

Before invites go out, the poster sees:

```
┌──────────────────────────────────────────┐
│ 📨 Inviting N for [activity]             │
│                                          │
│ 🕐 Best time: [time]                    │
│                                          │
│ [Person 1]  ✓ [status]                  │
│ [Person 2]  ⚠️ [constraint note]         │
│ [Person 3]  ✓ [status]                  │
│ [Person 4]  ⊘ Auto-skipped (reason)     │
│                                          │
│ 💡 [relevant preference surfaced]        │
│                                          │
│ [Invite at time] [Change time]           │
└──────────────────────────────────────────┘
```

Constraint notes are brief and actionable: "Arrives ~19:40 (Garching commute)" not "has a meeting and then needs to commute."

### When there's no good N-way overlap

If the overlap is too short for the activity, the system presents trade-offs:

```
⚠️ Scheduling challenge

Full N-way overlap: [window] ([duration] — too short for [activity])

Options:
A. Without [person]: [better window]
   "[reason they can't make it]"

B. Without [person]: [better window]
   "[reason they can't make it]"

C. [Different day]: all N free [window]

[Go with A] [Go with B] [Move to day] [Invite all anyway]
```

The poster makes **one decision**, not a group negotiation.

### Per-person acceptance cards

Each invitee gets a card personalized to their situation:

- **No issues**: simple confirm button
- **Late arrival**: "⚠️ You'd arrive around 19:40. [Join (I'll be ~10 min late)] [Can't make it]"
- **Soft conflict**: "⚠️ You have [event] at [time]. [Join anyway] [Can't make it]"
- **Dietary/preference note**: surfaced to poster in the pre-invite screen, not shown on invitee's card (it's their own preference — they know it)

### "Suggest different time" flow

If an invitee wants a different time:

1. They tap [Suggest different time]
2. See 2–3 alternative slots (from the same mutual overlap, just different times)
3. Pick one, or write a brief message
4. Poster gets notification: "[Person] would prefer [time]. [Keep original] [Change to suggested]"

This is one back-and-forth, not a group discussion.

### Progressive confirmation

For group postings, invites go out simultaneously (parallel) but responses arrive at different times. The poster sees a live status:

```
🍝 Friday dinner — 2 of 3 confirmed
  Lena ✓  Kai ✓  Priya ⏳
  📅 Friday 19:30
```

When all confirm, posting goes active and calendar events are created for everyone simultaneously.

---

## 4. LLM Prompt Structure

### Slot generation prompt (1-on-1)

```
You are generating time slot suggestions for an activity.

POSTING:
{posting_text}
Activity type: {activity_type}
Inferred duration: {duration_minutes} minutes

MUTUAL AVAILABILITY:
{overlap_windows}

POSTER'S SCHEDULING PREFERENCES:
{poster_prefs or "None specified"}

CANDIDATE'S SCHEDULING PREFERENCES:
{candidate_prefs or "None specified"}

CANDIDATE'S NEXT EVENT:
{next_event or "None within 4 hours of overlap"}

CONTEXT:
Current time: {now}
Date: {date}
Sunset: {sunset_time}

Generate 2-5 time slots. Each slot has:
- start_time (HH:MM)
- end_time (HH:MM)
- note (optional, brief explanation if non-obvious constraints affected this slot)
- warning (optional, e.g. "arrives 10 min late" or "tight buffer")

Consider: travel time from preferences, buffers between activities,
activity-appropriate times (no early morning tennis, no late night hiking),
daylight for outdoor activities, commute realism.
```

### Slot generation prompt (group)

Same as above, but with all invitees' preferences and a summary of the N-way overlap. The LLM additionally produces:

- `best_time`: single recommended start time
- `trade_offs`: list of {person, constraint, impact} if the best time isn't perfect for everyone
- `alternatives`: if no good N-way overlap, options with subsets

### Model tier

Slot generation is a lightweight LLM call — short context, structured output. Suitable for a mid-tier model (e.g., Gemini Flash). Estimated cost: negligible per invite.

---

## 5. Edge Cases

### No calendar linked (one or both parties)

Treat as fully available within the posting's time window. Show evenly-distributed slots. The LLM still applies context-aware filtering (no 5am tennis).

### Scheduling preferences but no calendar

The LLM applies preferences as soft constraints on the posting's time window. "Nothing before 10am" + posting says "morning" → suggest 10:00 start instead of earlier.

### Timezone differences

For remote activities, convert times to each participant's timezone. Show both:

- "15:00 your time (16:00 CET)"

### Very short overlap

If mutual overlap is shorter than the inferred duration:

- Show the overlap with a warning: "You're both only free [window] ([duration]). [Activity] usually takes [expected]. [Join for [duration] anyway] [Suggest another day]"

### Conflicting preferences

If poster says "mornings" and candidate says "nothing before 10am":

- The LLM picks 10:00+ (satisfies both)
- If no overlap exists that satisfies both, show the best compromise with a note

### Last-minute changes

If a participant's calendar changes after accepting (new meeting added):

- Notification: "⚠️ A new event conflicts with [activity] at [time]. [Keep commitment] [Withdraw]"
- Poster notified if someone withdraws → waitlist kicks in

---

## 6. Implementation Phases

| Phase | Scope                                                                                   | Depends on                                    |
| ----- | --------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1     | `scheduling_preferences` field on profiles. Settings UI for editing.                    | —                                             |
| 2     | 1-on-1 slot generation: overlap computation + LLM slot suggestion for acceptance cards. | Calendar sync (availability-calendar Phase 3) |
| 3     | Group scheduling: N-way overlap, poster recommendation screen, per-person cards.        | Phase 2                                       |
| 4     | Travel time estimation from profile/posting locations (deterministic, no transit API).  | Phase 2                                       |
| 5     | Conflict detection: post-acceptance calendar change notifications.                      | Phase 2, calendar webhooks                    |

---

## 7. Integration Points

- **`spec/availability-calendar.md`**: Provides the calendar data (sync, free/busy, overlap scoring). This spec adds the intelligence layer on top.
- **[1-text-first.md](1-text-first.md)**: The acceptance card is part of the text-first flow. This spec defines how time slots are generated for that card.
- **Matching ([1-matching.md](1-matching.md))**: Scheduling preferences text is readable by the deep match LLM, so "nothing before 10am" naturally influences match scores for early-morning postings. This is emergent, not a separate mechanism.
- **Spaces ([1-spaces.md](1-spaces.md))**: Scheduling intelligence works the same within Spaces. A posting-message "meet Thursday?" within a Space auto-scopes to the Space's members for calendar overlap. Rich interactive cards (time proposal cards, RSVP cards) embed scheduling intelligence directly into the conversation timeline.
