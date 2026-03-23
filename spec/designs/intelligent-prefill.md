# Intelligent Prefill — Design Document

> Detailed implementation plan for calendar-aware card suggestions, smart prefill, chained flows, and scheduling intelligence. Implements the Card Principles from [1-spaces.md](../1-spaces.md) §7 and the Intelligent Coordination Flows from [0-use-cases.md](../0-use-cases.md).

---

## 1. Overview

The current card suggestion flow: message → LLM detects intent → single suggestion chip → user opens dialog → fills fields → creates card. Intelligence is limited to text-based intent detection, and suggestions only appear after the user sends a message.

The target flow: user types text → cheap detector flags coordination intent while composing → card type chips appear (1–3 plausible types) → user taps a type → LLM generates prefilled card from calendars, profiles, and conversation context → pre-filled dialog → user confirms or edits → card appears. The user's compose text becomes the card description.

**Key architectural changes**:

1. **Cheap detect, expensive generate**: Split the old fused LLM call into two stages. A lightweight heuristic (client-side regex/keyword patterns) detects coordination intent and suggests card types — no LLM cost. The full LLM call (calendar overlap, member notes, slot generation) only fires when the user commits to a card type by tapping a chip.

2. **Type selector, not type guesser**: Instead of the system picking one card type, present 1–3 plausible types and let the user choose. This eliminates the RSVP-vs-time-proposal ambiguity problem.

3. **Three triggers**: Suggestions appear while composing (A), after sending (B, fallback), and when reading others' messages with coordination intent (C). Currently only B exists.

4. **Manual creation is also smart**: The "+" card creation menu auto-fills every card type from conversation context by default. The suggestion chips and the manual menu converge on the same pre-filled dialog.

---

## 2. Two-Stage Detection and Generation

### Stage 1: Cheap Detector (client-side, no LLM)

A lightweight heuristic that runs on the client as the user types or when new messages arrive. Its job is narrow: detect whether coordination intent exists and which 1–3 card types are plausible. It does NOT generate card content.

**Heuristic rules** (regex/keyword patterns):

| Pattern                                                        | Suggested types     |
| -------------------------------------------------------------- | ------------------- |
| Question mark + time/day words ("friday", "next week", "when") | Time proposal, RSVP |
| Question mark + multiple options (comma/or-separated items)    | Poll                |
| "who can", "who wants to", "volunteers"                        | Task claim          |
| "where should", "what place"                                   | Location, Poll      |
| Specific time stated ("at 2pm", "tomorrow 14:00")              | RSVP, Time proposal |
| General decision question ("should we", "what do you think")   | Poll                |

**Output**: `{ hasIntent: boolean, plausibleTypes: CardType[], confidence: number }`. Threshold for showing chips: confidence > 0.5.

**Trigger A (composing)**: runs on debounced text change (~500ms after typing pauses). Shows card type chips near compose area.

**Trigger B (after send)**: runs on the sent message text. Same chips appear if user didn't act on trigger A.

**Trigger C (reading)**: runs on the latest message from another member. Shows chips contextualized to that message.

### Stage 2: LLM Generation (on user tap, server-side)

Only fires when the user taps a card type chip or opens a card creation dialog. The LLM receives the chosen card type plus full context and generates prefilled data. This is the expensive call — calendar overlap, member notes, slot generation.

The user's compose text (or the triggering message for trigger C) is passed as context and used as the card description.

| Aspect           | Old (fused detect+suggest) | New (cheap detect → LLM generate on tap)      |
| ---------------- | -------------------------- | --------------------------------------------- |
| Latency to chips | ~600ms (after send only)   | <50ms (client-side heuristic)                 |
| LLM calls        | Every message sent         | Only when user taps a type                    |
| Cost             | ~$0.001 per message        | ~$0.001 per card created (not per message)    |
| Type accuracy    | System guesses one type    | User chooses from 1–3 options                 |
| Trigger moments  | After send only            | While composing + after send + reading others |

### Input context (assembled by suggest API, stage 2 only)

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
// Stage 1: Cheap detector output (client-side)
interface CardIntentDetection {
  hasIntent: boolean;
  plausibleTypes: CardType[]; // 1-3 types, ordered by likelihood
  confidence: number; // 0-1, threshold 0.5
  triggerMessage?: string; // The message that triggered detection (for trigger C)
}

// Stage 2: LLM generation output (server-side, after user taps a type)
interface CardGenerationResult {
  card_type: CardType; // The type the user chose
  prefill: {
    description?: string; // From user's compose text — preserves conversational warmth
    title?: string; // Card title
    question?: string; // Poll question
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

### LLM system prompt (stage 2 — generation only)

The user has already chosen the card type. The LLM's job is to generate the best prefill data for that type.

```
You are a coordination assistant generating a pre-filled {{CARD_TYPE}} card.

The user wrote: "{{COMPOSE_TEXT}}"
Use this as the card description. Extract structured data from it for the card fields below.

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

2. **LLM generation function** (refactor: `src/lib/ai/card-suggest.ts`)
   - Refactor `detectAndSuggest()` → `generateCardPrefill(cardType, messages, calendarContext, memberProfiles, composeText)`
   - Takes the user-chosen card type as input (no longer guesses type)
   - Returns `CardGenerationResult` (see schema above)
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

### Phase B: Suggestion UX Overhaul

**Goal**: Cheap detector with type selector chips, three triggers (compose/send/read), auto-fill in manual menu, calendar context strip, deadlines on cards.

**Changes:**

1. **Cheap client-side detector** (new: `src/lib/cards/card-intent-detector.ts`)
   - Pure function: `detectCardIntent(text: string): CardIntentDetection`
   - Regex/keyword heuristics (see §2 Stage 1 above)
   - No network call, runs on debounced text change (~500ms)
   - Returns 1–3 plausible card types

2. **Type selector chips** (redesign: `card-suggestion-chip.tsx` → `card-type-chips.tsx`)
   - Replaces single suggestion chip with 1–3 card type buttons
   - Each chip: icon + type name (e.g. `[📅 Time proposal] [📊 Poll]`)
   - Tapping a chip: calls suggest API with `{ cardType, composeText }` → opens pre-filled dialog
   - Chips appear in compose area (triggers A+B) or below a message (trigger C)

3. **Three trigger integration** (`compose-area.tsx`)
   - Trigger A: run `detectCardIntent()` on debounced `text` changes → show chips
   - Trigger B: run `detectCardIntent()` on sent message text → show chips (fallback)
   - Trigger C: run `detectCardIntent()` on latest incoming message → show chips contextualized
   - Chips auto-dismiss when user starts typing a new message or sends

4. **Auto-fill in manual "+" menu**
   - When user opens a card creation dialog from the "+" menu, call suggest API with `{ cardType, recentMessages }` to pre-fill the form
   - Every card type defaults to auto-filled from conversation context
   - Users can clear/edit pre-filled fields

5. **Calendar context strip** (new component: `src/components/spaces/cards/calendar-context-strip.tsx`)
   - Compact horizontal day view for the current user
   - Shows events surrounding the proposed time slot
   - Data: fetch user's `calendar_busy_blocks` for the relevant day (client-side, cached)
   - Rendered below each time slot option on time proposal cards
   - Also shown in suggestion chip preview for time proposals

6. **Deadline field on cards**
   - Migration: add `deadline timestamptz` to `space_cards`
   - Card creation API accepts `deadline` parameter
   - Defaults: time_proposal 12h, RSVP 24h, poll 24h, task_claim null, location 24h
   - Card rendering: "Closes in 8h" or "Closes Fri 18:00" (relative when <24h, absolute when >24h)
   - Auto-resolve at deadline: check in the GET handler (on-read) OR lightweight cron
     Recommendation: on-read check is simpler — when fetching cards, if `deadline < now` and status is `active`, auto-resolve inline. No cron needed for MVP.

7. **Detection prompt improvements** (in new `card-suggest.ts`)
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
STAGE 1: CHEAP DETECTION (client-side, no LLM)
═══════════════════════════════════════════════

Trigger A: User typing          Trigger B: User sent msg     Trigger C: Incoming message
"dinner friday or saturday?"    "dinner friday?"             Priya: "should we do something?"
         │                               │                            │
         └───────────────┬───────────────┘────────────────────────────┘
                         ▼
              ┌─────────────────────┐
              │  detectCardIntent() │  (regex/keyword heuristics)
              │  ~0ms, no network   │
              └─────────┬───────────┘
                        ▼
              ┌─────────────────────────────────┐
              │  Type selector chips             │
              │  [📅 Time proposal] [📊 Poll]   │
              │  (1–3 plausible types)           │
              └─────────┬───────────────────────┘
                        │ user taps a type
                        ▼

STAGE 2: LLM GENERATION (server-side, on user tap)
═══════════════════════════════════════════════════

┌─────────────────────────────────┐
│  Suggest API                     │
│  Input: cardType + composeText   │
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
│  │ LLM Generation (Flash    │   │
│  │ Lite)                     │   │
│  │ - Generate prefill        │   │
│  │ - Compute member notes    │   │
│  │ - Infer duration          │   │
│  │ - Suggest deadline        │   │
│  └──────────┬───────────────┘   │
│             ▼                    │
│  Return CardGenerationResult    │
└─────────────┬───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Pre-filled dialog               │
│  Description: user's text        │
│  Fields: from LLM generation     │
│  [Send] [Edit fields] [✕]       │
└─────────────┬───────────────────┘
              │
     ┌────────┴────────┐
     ▼                  ▼
  Quick-send        Edit + create
  (1 tap)           (review fields)
     │                  │
     └────────┬─────────┘
              ▼
┌─────────────────────────────────┐
│  Card created in conversation    │
│  - User's text as description    │
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

### Stage 1: Detection → chips visible

| Step               | Target   | Notes                                   |
| ------------------ | -------- | --------------------------------------- |
| Cheap detector     | <5ms     | Client-side regex/keyword, no network   |
| **Total to chips** | **<5ms** | Chips appear while user is still typing |

### Stage 2: User taps chip → dialog opens pre-filled

| Step                     | Target     | Notes                                       |
| ------------------------ | ---------- | ------------------------------------------- |
| Member + calendar fetch  | <100ms     | Parallel queries, admin client              |
| Overlap computation      | <20ms      | In-memory, small arrays                     |
| Hidden text extraction   | <5ms       | String parsing                              |
| LLM generation call      | <500ms     | Flash Lite, structured output               |
| **Total to dialog**      | **<600ms** | Dialog opens pre-filled within ~0.6s of tap |
| Quick-send card creation | <200ms     | Direct API call                             |
| Calendar strip render    | <50ms      | Client-side from cached busy blocks         |

---

## 6. Reference: Use Case Flows

These flows from [0-use-cases.md](../0-use-cases.md) define the exact behavior this implementation must support:

- **Flow 1: Friday Dinner** — Alex types "dinner friday?" → cheap detector shows `[📅 Time proposal] [📊 Poll]` → Alex taps Time proposal → LLM reads N-way calendars + `||hidden||` preferences → pre-filled dialog with 3 slots + member notes → Alex confirms → card sent with "dinner friday?" as description
- **Flow 2: Quick Call** — specific time stated → cheap detector shows `[✋ RSVP] [📅 Time proposal]` → user chooses RSVP (or Time proposal if they want negotiation) → decline-and-suggest to both parties, calendar context strip
- **Flow 3: Hackathon Team** — "who wants to do frontend?" → detector shows `[🙋 Task claim] [📊 Poll]` → user picks the right type. Chained time proposal after task assignment
- **Flow 4: Recurring Practice** — RSVP with deadline, non-response as expected behavior, threshold-based resolution
- **Flow 5: Trigger C** — Priya sends "should we do something this weekend?" → Alex sees chips `[📅 Time proposal] [📊 Poll]` in compose area → Alex taps Time proposal without typing anything → card created from Priya's message context
