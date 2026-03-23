# Intelligent Prefill — Design Document

> Detailed implementation plan for calendar-aware card suggestions, smart prefill, chained flows, and scheduling intelligence. Implements the Card Principles from [1-spaces.md](../1-spaces.md) §7 and the Intelligent Coordination Flows from [0-use-cases.md](../0-use-cases.md).

---

## 1. Overview

The current card suggestion flow: message → LLM detects intent → suggestion chip → user opens dialog → fills fields → creates card. Intelligence is limited to text-based intent detection.

The target flow: message → LLM detects intent AND generates prefilled options from calendars, profiles, and conversation context → suggestion chip with preview → user taps to send (or edits) → card appears with smart defaults, deadlines, and per-member context.

**Key architectural change**: fuse detection and suggestion into a single LLM call. The LLM receives full context (messages + calendar overlap + `||hidden||` profile text) and returns both the card type decision and prefilled data in one response. This reduces latency (one round trip instead of two) and improves detection quality (calendar context informs type decisions).

---

## 2. Fused Detect-and-Suggest LLM Call

### Why fuse

| Aspect            | Separate calls                            | Fused call                                                                                             |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Latency           | ~400ms detect + ~400ms suggest            | ~500ms total                                                                                           |
| Detection quality | Text-only context                         | Calendar + profiles inform type choice                                                                 |
| Example           | "let's meet at 2" → detects time_proposal | Same message + calendar shows both free at 14:00 → detects RSVP (specific time, no negotiation needed) |
| Token cost        | Detect: ~200 tokens. Suggest: ~800 tokens | Fused: ~900 tokens (shared context)                                                                    |
| Model             | Flash-lite handles both                   | Flash-lite handles both                                                                                |

### Input context (assembled by suggest API)

```
RECENT MESSAGES (last 5):
{messages with sender names}

SPACE CONTEXT:
Members: {member names + count}
Space type: {DM / small group / large}

CALENDAR OVERLAP (next 14 days):
{computed overlap windows, formatted as concrete date ranges}
Members without calendars: {names} (treat as fully available)

MEMBER SCHEDULING PREFERENCES (from ||hidden|| profile text):
{member_name}: {hidden text or "None"}
...

CURRENT TIME: {ISO timestamp}
```

### Output schema (structured JSON)

```typescript
interface DetectAndSuggestResult {
  // Detection
  suggested_type:
    | "poll"
    | "time_proposal"
    | "rsvp"
    | "task_claim"
    | "location"
    | null;
  confidence: number; // 0-1, threshold 0.6
  reason: string; // Brief explanation for chip display

  // Prefill (populated when suggested_type is not null)
  prefill: {
    title?: string; // Card title
    question?: string; // Poll question
    description?: string; // Task claim description
    options?: string[]; // Poll options, task roles, or location name

    // Time-specific (time_proposal or rsvp)
    slots?: Array<{
      label: string; // "Fri Mar 21, 19:00"
      start: string; // ISO datetime
      end: string; // ISO datetime
    }>;
    duration_minutes?: number; // Inferred from activity type
    is_specific_time?: boolean; // true = RSVP, false = time proposal

    // Per-member (for Private Constraints, small Spaces only)
    member_notes?: Record<string, string>; // userId → "Your meeting ends at 18:30, ~30 min buffer"

    // Deadline suggestion
    suggested_deadline_hours?: number; // e.g., 12 for time proposals, 24 for RSVP
  };
}
```

### LLM system prompt (key additions)

```
You are a coordination assistant analyzing a group conversation.

CARD TYPE RULES:
- "who wants X?" / "who can X?" → task_claim (volunteering, not voting)
- "what should we X?" / "which option?" → poll (group decides one answer)
- "when should we X?" / scheduling question → time_proposal (generate slots from calendar overlap)
- "let's do X at Y" / specific time stated → rsvp (confirmation, not negotiation)
  BUT: only if calendar shows participants are free. If conflicts exist, suggest time_proposal instead.
- location questions → location

TIME SLOT GENERATION:
When suggesting time_proposal, generate 2-5 slots from the CALENDAR OVERLAP provided.
- Infer duration from activity type (coffee → 30-45 min, dinner → 2h, call → 15-30 min, study → 2-3h)
- Apply scheduling preferences as soft constraints (buffer times, commute, time-of-day preferences)
- Context-aware filtering (no early morning tennis, no late-night hiking, daylight for outdoor)
- Distribute slots across different days/times when overlap is wide
- Round to 15-minute boundaries

MEMBER NOTES:
For each member, generate a one-line private note explaining how the suggested time fits their schedule.
Read their scheduling preferences and calendar context. Examples:
- "Your meeting ends at 18:30, ~30 min buffer → ready by 19:00"
- "You're free all afternoon ✓"
- "~40 min commute from Garching → arrive by 19:40"
Only generate notes when there's something non-obvious to say. Skip if the member has no constraints.

RSVP THRESHOLD:
For RSVPs, suggest threshold as ceil(member_count * 0.6).

SPECIFIC TIME DETECTION:
If the message specifies an exact time AND all members' calendars show they're free:
- Set is_specific_time = true
- Return a single slot with that time
- Card type should be "rsvp" not "time_proposal"
If the time is specific but some members have conflicts:
- Set is_specific_time = false
- Return the specific time PLUS 2-3 alternatives from overlap
- Card type should be "time_proposal"
```

### Model choice

Gemini Flash Lite. The fused call adds ~400 tokens of calendar context but the model handles structured output well at this size. Cost is negligible (~$0.001 per suggestion). If Flash Lite struggles with member_notes quality, consider Flash (not Pro) — still fast enough.

---

## 3. Implementation Phases

### Phase A: Calendar-Aware Time Proposals

**Goal**: "dinner friday?" → pre-filled time slots computed from N-way calendar overlap.

**Changes:**

1. **Suggest API enrichment** (`/api/spaces/[id]/cards/suggest/route.ts`)
   - After receiving message(s), before calling LLM:
   - Fetch all Space members' profiles (join `availability_slots`, `timezone`, `source_text`)
   - Fetch `calendar_busy_blocks` for members with calendar connections
   - Extract `||hidden||` text from each member's `source_text` via `parseHiddenBlocks()`
   - Compute N-way overlap using `windowsToConcreteDates()` from `overlap-to-slots.ts` + busy block subtraction
   - Format overlap for LLM prompt via `formatSlotsForPrompt()`
   - Call the fused detect-and-suggest LLM (replaces current `detectCardIntent()`)

2. **Fused LLM function** (new: `src/lib/ai/card-suggest.ts`, replaces `card-detection.ts`)
   - Single function: `detectAndSuggest(messages, calendarContext, memberProfiles)`
   - Returns `DetectAndSuggestResult` (see schema above)
   - Uses Flash Lite with structured JSON output

3. **Structured slot format** in card data
   - `TimeProposalData.options` stores `{label, votes, start?, end?}` (backward compatible — start/end optional)
   - Calendar integration reads `start`/`end` when available instead of parsing label text
   - Duration stored in card `data.duration_minutes`

4. **Time proposal dialog** (`create-time-proposal-dialog.tsx`)
   - Pass `isLoadingSlots={true}` while suggest API runs (prop already exists, line 123)
   - Pre-fill with returned slots
   - User can add/remove/reorder slots before creating

5. **RSVP threshold** (`create-rsvp-dialog.tsx`)
   - Default threshold from `ceil(memberCount * 0.6)` instead of hardcoded 2

**Files touched:**

- `src/app/api/spaces/[id]/cards/suggest/route.ts` — major rewrite
- `src/lib/ai/card-suggest.ts` — new file (replaces `card-detection.ts`)
- `src/lib/ai/card-detection.ts` — deprecated, calls forwarded to new module
- `src/components/spaces/cards/create-time-proposal-dialog.tsx` — wire loading state + structured slots
- `src/components/spaces/cards/create-rsvp-dialog.tsx` — dynamic threshold default
- `src/lib/cards/calendar-integration.ts` — read structured start/end from slot data

**Depends on:** existing calendar sync infrastructure (already working).

### Phase B: Suggestion UX Upgrades

**Goal**: one-tap quick-send, calendar context strip, deadlines on cards, better detection.

**Changes:**

1. **Two-path suggestion chip** (`card-suggestion-chip.tsx`)
   - Primary button: quick-send (creates card directly with prefill data)
   - Secondary button: edit (opens dialog as today)
   - Chip shows preview: "📅 Fri 19:00 · 19:30 · 20:00" or "📊 Frontend · Backend · Design"
   - `onAccept(suggestion, quickSend: boolean)` in compose-area.tsx
   - Quick-send: POST `/api/spaces/[id]/cards` directly with prefill data as card data

2. **Calendar context strip** (new component: `src/components/spaces/cards/calendar-context-strip.tsx`)
   - Compact horizontal day view for the current user
   - Shows events surrounding the proposed time slot
   - Data: fetch user's `calendar_busy_blocks` for the relevant day (client-side, cached)
   - Rendered below each time slot option on time proposal cards
   - Also shown in suggestion chip preview for time proposals

3. **Deadline field on cards**
   - Migration: add `deadline timestamptz` to `space_cards`
   - Card creation API accepts `deadline` parameter
   - Defaults: time_proposal 12h, RSVP 24h, poll 24h, task_claim null, location 24h
   - Card rendering: "Closes in 8h" or "Closes Fri 18:00" (relative when <24h, absolute when >24h)
   - Auto-resolve at deadline: check in the GET handler (on-read) OR lightweight cron
     Recommendation: on-read check is simpler — when fetching cards, if `deadline < now` and status is `active`, auto-resolve inline. No cron needed for MVP.

4. **Detection prompt improvements** (in new `card-suggest.ts`)
   - Already covered by fused LLM prompt (§2 above)
   - Key distinctions: task_claim vs. poll, specific-time RSVP vs. open time_proposal

**Files touched:**

- `src/components/spaces/card-suggestion-chip.tsx` — two-path redesign
- `src/components/spaces/compose-area.tsx` — quick-send path
- `src/components/spaces/cards/calendar-context-strip.tsx` — new component
- `src/components/spaces/cards/time-proposal-card.tsx` — render calendar strip + deadline
- `src/components/spaces/cards/rsvp-card.tsx` — render deadline
- `src/components/spaces/cards/poll-card.tsx` — render deadline
- `src/components/spaces/cards/task-claim-card.tsx` — render deadline
- `supabase/migrations/` — add deadline column
- `src/app/api/spaces/[id]/cards/route.ts` — accept deadline, set defaults
- `src/app/api/spaces/[id]/cards/[cardId]/route.ts` — on-read deadline check

**Migration:**

```sql
alter table space_cards add column deadline timestamptz;
```

### Phase C: Chained & Reactive Flows

**Goal**: card events trigger follow-up suggestions; declines offer alternatives.

**Changes:**

1. **Decline-and-suggest**
   - In vote handler (`/cards/[cardId]/route.ts`): when processing "No" on RSVP
   - Compute alternative time slots (reuse fused suggest infrastructure)
   - Push suggestion to both the voter and the card creator via Realtime
   - New Realtime payload shape: `{ type: 'card_suggestion', suggestion: DetectAndSuggestResult }`
   - Client (`compose-area.tsx`): listen for `card_suggestion` events, show suggestion chip

2. **Chained card flow**
   - After card resolves (in PATCH handler for resolve action):
     - Time proposal resolved → if no location in Space: suggest location confirm
     - Poll resolved with scheduling-related result → suggest time proposal with result as constraint
     - RSVP resolved → no follow-up (terminal)
   - Trigger: call suggest API internally with `{ chain_from: cardId, resolution: resolvedData }`
   - Suggest API recognizes chained context and generates appropriate follow-up
   - Push via same Realtime mechanism

3. **Private constraint notes**
   - Already generated by fused LLM (Phase A `member_notes`)
   - Card creation API stores `member_notes` in card `data`
   - Card rendering: if `data.member_notes?.[currentUserId]`, show below slot options
   - Styling: muted text, lock icon, personal context

**Files touched:**

- `src/app/api/spaces/[id]/cards/[cardId]/route.ts` — decline detection + chained triggers
- `src/app/api/spaces/[id]/cards/suggest/route.ts` — accept `chain_from` context
- `src/lib/ai/card-suggest.ts` — chained suggestion prompt variant
- `src/components/spaces/compose-area.tsx` — listen for Realtime suggestions
- `src/components/spaces/cards/time-proposal-card.tsx` — render member_notes

### Phase D: Hidden Profile Integration

**Goal**: `||hidden||` works in the profile editor; users can add scheduling preferences.

**Changes:**

1. **Profile editor `||hidden||` rendering**
   - CodeMirror decoration: match `||...||` pattern, apply dimmed style + lock icon
   - Can reuse the markdown decoration infrastructure already in MeshEditor
   - Hidden blocks remain editable but visually distinct

2. **`/hidden` slash command**
   - Add to profile slash command registry
   - Behavior: wraps selected text in `||...||`, or inserts empty block with cursor inside
   - Same implementation pattern as existing `/time`, `/location` commands

3. **Onboarding integration**
   - During profile setup (step after bio text): prompt with scheduling preferences question
   - "Anything we should know when scheduling? (commute, buffer times, preferred hours)"
   - Response auto-wrapped in `||...||` and appended to profile text
   - Skippable

4. **LLM wiring** (partially done in Phase A)
   - `parseHiddenBlocks()` already extracts hidden content
   - Phase A already passes this to the fused LLM
   - Phase D ensures users can actually write hidden content in their profiles

**Files touched:**

- `src/components/editor/mesh-editor.tsx` — hidden block decoration
- `src/lib/editor/slash-commands.ts` — `/hidden` command
- `src/components/onboarding/` — scheduling preferences prompt step
- `src/lib/hidden-syntax.ts` — may need minor adjustments for profile context

---

## 4. Data Flow Diagram

```
User sends message in Space
         │
         ▼
┌─────────────────────────────────┐
│  Suggest API                     │
│  ┌──────────────────────────┐   │
│  │ 1. Fetch last 5 messages │   │
│  │ 2. Fetch member profiles │   │
│  │    - availability_slots  │   │
│  │    - source_text         │   │
│  │    - timezone            │   │
│  │ 3. Fetch busy blocks     │   │
│  │ 4. Compute N-way overlap │   │
│  │ 5. Extract ||hidden||    │   │
│  │ 6. Format LLM context    │   │
│  └──────────┬───────────────┘   │
│             ▼                    │
│  ┌──────────────────────────┐   │
│  │ Fused LLM (Flash Lite)   │   │
│  │ - Detect card type       │   │
│  │ - Generate prefill       │   │
│  │ - Compute member notes   │   │
│  │ - Infer duration         │   │
│  │ - Suggest deadline       │   │
│  └──────────┬───────────────┘   │
│             ▼                    │
│  Return DetectAndSuggestResult  │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Client: Suggestion Chip        │
│  "📅 Fri 19:00 · 19:30 · 20:00"│
│  [Send] [Edit] [✕]             │
└─────────────┬───────────────────┘
              │
     ┌────────┴────────┐
     ▼                  ▼
  Quick-send        Edit dialog
  (1 tap)           (review + create)
     │                  │
     └────────┬─────────┘
              ▼
┌─────────────────────────────────┐
│  Card created in conversation    │
│  - Deadline set                  │
│  - Member notes stored           │
│  - Realtime broadcast            │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Members interact (vote/claim)   │
│  - Calendar strip per user       │
│  - Private constraint notes      │
│  - Auto-resolve at consensus     │
│  - Auto-resolve at deadline      │
└─────────────┬───────────────────┘
              │
     ┌────────┴────────┐
     ▼                  ▼
  Resolved           Declined/No vote
  → Calendar event   → Decline-and-suggest
  → Chained suggest    (both parties)
```

---

## 5. Latency Budget

| Step                     | Target     | Notes                                       |
| ------------------------ | ---------- | ------------------------------------------- |
| Member + calendar fetch  | <100ms     | Parallel queries, admin client              |
| Overlap computation      | <20ms      | In-memory, small arrays                     |
| Hidden text extraction   | <5ms       | String parsing                              |
| Fused LLM call           | <500ms     | Flash Lite, structured output               |
| **Total suggest**        | **<600ms** | User sees chip within 1s of sending message |
| Quick-send card creation | <200ms     | Direct API call                             |
| Calendar strip render    | <50ms      | Client-side from cached busy blocks         |

---

## 6. Reference: Use Case Flows

These flows from [0-use-cases.md](../0-use-cases.md) define the exact behavior this implementation must support:

- **Flow 1: Friday Dinner** — N-way calendar overlap, `||hidden||` preferences (commute, buffer), 3 pre-filled slots, private constraint notes per member, chained location suggestion after time resolves
- **Flow 2: Quick Call** — specific time detection → RSVP (not time proposal), decline-and-suggest to both parties, calendar context strip, two-path chip (quick-send vs. edit)
- **Flow 3: Hackathon Team** — task_claim vs. poll detection, chained time proposal after task assignment, declarative "let's meet at X" → RSVP
- **Flow 4: Recurring Practice** — RSVP with deadline, non-response as expected behavior, threshold-based resolution
