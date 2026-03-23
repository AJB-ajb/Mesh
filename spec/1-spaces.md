# Spaces

> The fundamental unit of Mesh is the **Space** (Coordination Space) -- a conversation context with members, state, and coordination tools. Conversation is primary; structure is derived.

---

## 1. Core Concept

The current posting-centric model treats the activity posting as the fundamental unit, bolting conversation on as a feature inside it. In practice, people coordinate through conversation -- messages are the natural medium for working out what to do, who's in, and when to meet.

The Spaces model inverts this: **conversation is the medium, but the system understands the structure within it.** A Space is a conversation context. Coordination happens through messages. When structure is needed -- matching, invites, lifecycle management -- a posting-message adds it within the conversation.

This is not "going back to messaging." The problem was never conversation itself -- it was conversation _without structure_. Messaging apps have no understanding of what's being coordinated. Spaces keep conversation as the natural interface while embedding coordination intelligence: posting-messages carry matching, capacity, and lifecycle; rich interactive cards replace back-and-forth with structured actions; the state text gives the system a machine-readable summary.

### What stays the same

- Text-first philosophy -- text is the primary input, structure is extracted ([1-text-first.md](1-text-first.md))
- Matching pipeline -- fast filter + deep LLM match ([1-matching.md](1-matching.md))
- Negotiation substitution -- who/when/where/what/how many resolved by mechanisms, not back-and-forth
- `mesh:` link syntax, `||hidden||`, `||?||`
- Sequential/parallel invites
- Calendar overlap and scheduling intelligence ([1-scheduling.md](1-scheduling.md))
- Skills system and profile text

### What changes

| Before                                        | After                                            |
| --------------------------------------------- | ------------------------------------------------ |
| Posting is the primary unit                   | Space (conversation context) is the primary unit |
| Feed of postings                              | List of Spaces (messenger-like)                  |
| Group chat and coordination are separate tabs | Unified conversation timeline                    |
| Standalone posting creation flow              | Posting-message type within a Space              |
| DMs as a separate feature                     | 2-person Spaces                                  |
| Discover page                                 | The Global Space (Explore)                       |

---

## 2. Space Types

There is no type enum. Behavior emerges from size, settings, and context.

| What                         | Space form                          | Typical size |
| ---------------------------- | ----------------------------------- | ------------ |
| DM with a connection         | 2-person Space                      | 2            |
| Small group coordination     | Small Space                         | 3--10        |
| Hackathon, course, community | Large Space (public or invite-link) | 10--500+     |
| Global discovery             | Global Space (Explore)              | All users    |

Every conversation context in Mesh is a Space. The same layout works at every size, with features progressively enabled or disabled.

### Progressive features by size

| Feature                | 2-person     | Small (~3--10) | Medium (~10--50)      | Large (~50+)       |
| ---------------------- | ------------ | -------------- | --------------------- | ------------------ |
| Regular messages       | yes          | yes            | yes (can be disabled) | admin-configurable |
| Posting-messages       | yes          | yes            | yes                   | yes                |
| Sub-Space browsing     | n/a          | optional       | useful                | primary navigation |
| Matching on sub-Spaces | no           | no             | optional              | yes                |
| Notification default   | all activity | all activity   | muted for most        | digest             |
| Posting-only mode      | no           | no             | optional toggle       | common default     |

Admins configure what makes sense. The system suggests defaults based on member count, but the admin decides.

### The Global Space (Explore)

- Everyone is a virtual member (no `space_members` rows -- see D4 below).
- Posting-only: a stream of posting-messages replacing the current Discover feed.
- Browsable, filterable, sortable. Matching surfaces relevant postings per user.
- Always pinned at the top of the Space list.

---

## 3. Conversation

A Space's conversation is a single timeline of messages, posting-messages, system messages, and rich interactive cards. This is the primary view for small Spaces; large Spaces foreground sub-Space browsing instead.

### Regular messages

Standard chat messages. Markdown text. Available in all Spaces where messaging is enabled (disabled in posting-only Spaces).

### Posting-messages

A special message type that adds structure to the conversation. Created via an explicit **Message | Posting** toggle in the compose area. A posting-message:

- Appears in the conversation as a structured card (title, text preview, status, CTA)
- Carries coordination properties: matching enabled, capacity, deadline, auto-accept, invites
- Can spawn a sub-Space for its own coordination
- Has a lifecycle: open -> active -> closed/filled/expired
- Is essentially the current "posting" entity, embedded in a conversation

In posting-only Spaces, the toggle is locked to Posting.

---

## 4. Posting-Messages

Posting-messages are the structured coordination unit within a Space. They replace standalone postings. Each posting-message lives _in_ a parent Space and can _spawn_ a sub-Space (see D1).

### Properties

Same as the current posting model: text, category, tags, capacity, team_size_min, deadline, activity_date, visibility, auto_accept, status, extracted_metadata, embedding. Skills are linked via a join table.

### Lifecycle

`open` -> `active` -> `closed` | `filled` | `expired`

- **open**: accepting join requests / matching
- **active**: coordination in progress (team formed, scheduling happening)
- **closed/filled/expired**: coordination complete or timed out

### Matching scope

The candidate pool is determined by the parent Space:

| Parent Space           | Candidate pool                      |
| ---------------------- | ----------------------------------- |
| Global Space (Explore) | All users                           |
| Public or large Space  | Space members                       |
| Small Space            | No matching -- broadcast to members |

Deep matching receives the parent Space's state text as additional context, improving match quality. See [1-matching.md](1-matching.md) for pipeline details.

---

## 5. State Text

Every Space has a **state text** -- a living markdown document summarizing its purpose, context, and current status. This replaces the "posting text" concept with something more general.

### Properties

- **Manually editable** by privileged members. Same editor as today, with `/clean`, `/format`, etc.
- **LLM-suggested updates**: triggered on-demand via `/summarize`, or suggested when a coordination card resolves (e.g., time confirmed, RSVP complete). The LLM proposes an update; the user approves with one tap.
- **Hidden content**: `||hidden||` and `||?||` syntax works in state text (see [1-text-first.md](1-text-first.md)).
- **Source of truth**: what new members, outsiders, and the matching system see. The conversation is the history; the state text is the current snapshot.

### Pre-invite drafting

A user can create a Space (just themselves), iterate on the context through conversation with the AI, approve state text updates, and only then invite or make public. Pre-invite conversation is hidden from later joiners via `visible_from` (see Membership below).

---

## 6. Sub-Spaces and Threads

A posting-message can spawn a sub-Space. Sub-Spaces inherit context from their parent Space (topic, location, time scope, visibility).

### Rendering (D2)

Sub-Spaces render as **threads anchored to their posting-message** in the parent conversation:

- **Collapsed by default**: "3 replies" under the posting card
- **Expandable inline**: thread opens below the card, within the parent conversation
- **Full-screen on tap**: for long threads or complex coordination
- Coordination cards (time proposals, RSVPs) live in the thread, not the parent timeline

### Creation timing

- **Posting-only Spaces**: sub-Space created immediately on posting-message send
- **Small Spaces**: sub-Space created on first reply or first join -- posting resolves inline until then

### Inherited vs. independent membership (D3)

| Flavor                | `inherits_members` | Membership                                       | When                                                              |
| --------------------- | ------------------ | ------------------------------------------------ | ----------------------------------------------------------------- |
| Inherited thread      | `true`             | Same as parent -- no `space_members` rows needed | Default. Coordination within an existing group.                   |
| Independent sub-Space | `false`            | Own `space_members` rows, can differ from parent | When outsiders join (matching), or creator restricts to a subset. |

Default is `inherits_members = true`. Transitions to `false` when:

- Someone outside the parent Space joins via matching or invite link
- The creator explicitly makes it public/discoverable
- Membership is explicitly restricted to a subset

The transition is automatic: starts as inline thread, becomes visually distinct when membership diverges. The rendering reflects this -- inherited threads feel like replies; independent sub-Spaces appear in the parent's sub-Space list.

### Nesting depth

Typically one level: Space -> sub-Space. No artificial depth limit, but the UX is designed for one level being the common case.

---

## 7. Rich Interactive Cards (Phase 2)

Coordination happens through **rich interactive cards** -- structured messages embedded in the conversation that members interact with via taps instead of writing messages.

### Card types

| Type             | Content                           | Interaction                             | Resolution                              |
| ---------------- | --------------------------------- | --------------------------------------- | --------------------------------------- |
| Time proposal    | 3--4 slots from calendar overlap  | Tap preferred slot(s), votes shown live | Auto-confirms when enough members align |
| RSVP             | Event description + time          | Yes / No / Maybe                        | Threshold triggers confirmation         |
| Poll             | Multiple-choice question          | Tap to vote                             | Results visible to all                  |
| Task claim       | "Who handles X?" with member list | "I'll do it"                            | Claimed -> assigned                     |
| Location confirm | Map pin + address                 | Confirm / Suggest different             | Confirmed when agreed                   |
| Trade-off        | "No perfect option -- pick one"   | Creator/admin picks                     | Selected option confirmed               |

### Where cards live

- **Shared cards** (in conversation timeline): time proposals, RSVPs, polls, task claims, location confirms. All Space members see and interact with them.
- **Personal cards** (in Activity tab): match notifications, invite cards, personalized scheduling info. Your private action queue. Tapping an action lands you in the relevant Space.

### Cards are living objects

Active (unresolved) cards update when context changes. Resolved cards are frozen.

- **Tap on card**: immediate in-place update (vote tallied, result shown)
- **Message that changes context (minor)**: in-place update with "updated" marker
- **Message that invalidates all options (major)**: old card marked superseded, new card generated
- **No activity for N hours**: optional nudge

### Card invalidation scoping

Only **active** cards are candidates for invalidation. The system maintains a small set of currently unresolved cards per Space (typically 0--2). On each new message, the LLM checks whether it changes any assumption behind the active cards. Phase 1: explicit button actions only. Phase 2: free-text detection with user confirmation (false positives are worse than false negatives).

### Who triggers card updates via messages

- **Small Spaces**: any member's message
- **Large Spaces**: only admin/organizer messages
- **2-person Spaces**: both equally

### Card Principles

Five named principles govern how cards behave. These names are canonical — use them in specs, code comments, and documentation.

#### Principle 1: Intelligent Pre-fill

Cards are pre-filled from context — calendars, profiles, conversation, and the user's own compose text. The user's main effort is typing their intent; the system drafts the structured card from it.

| Input                           | What the system reads                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Compose text                    | The message the user is writing — used as card description and to extract options, times, etc. |
| Conversation history            | Last ~5 messages for intent + context                                                          |
| Calendars                       | N-way free/busy overlap for all Space members                                                  |
| Profile `\|\|hidden\|\|` fields | Scheduling preferences, commute info, buffer needs                                             |
| Activity type                   | Duration inference ("dinner" → 2h, "quick call" → 15 min)                                      |

**Three suggestion triggers:**

| Trigger                | When                                             | What appears                                                                                                                                                         |
| ---------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. While composing** | User types text with coordination intent         | 1–3 card type chips appear near compose area (e.g. `[📅 Time proposal] [📊 Poll]`). User taps a type → dialog opens pre-filled from their text.                      |
| **B. After sending**   | User sends a message with coordination intent    | Same chips appear as fallback, in case the user sent before acting on trigger A.                                                                                     |
| **C. After reading**   | Another member's message has coordination intent | Chips appear in the reader's compose area, suggesting they can act on the intent (e.g. "Priya asked about this weekend — `[📅 Time proposal]`"). Any member can act. |

**Cheap detector, expensive generator**: A lightweight heuristic (regex/keyword patterns — question marks, time words, comma-separated options, "who can/wants" phrases) detects coordination intent and determines 1–3 plausible card types. This runs client-side or as a fast check, with no LLM call. The expensive LLM call (calendar reading, slot generation, option extraction, member notes) only runs when the user taps a card type chip.

**Type selector, not type guesser**: The system often cannot determine whether the user wants an RSVP vs. a time proposal, or a poll vs. a task claim. Instead of guessing one type, it presents plausible types and the user chooses. The system fills the content; the user picks the shape.

**Message as card description**: When a card is created via a suggestion chip, the user's compose text becomes the card's description field — preserving conversational warmth while adding structure. The text message is not sent separately.

**Manual creation is also smart**: The "+" card creation menu always auto-fills from conversation context. Whether the user arrives via a suggestion chip or the manual menu, the dialog opens pre-filled. This is the default behavior, not a special mode. Users can always clear or edit what the AI pre-filled.

**Two-path interaction**: when context is complete, the user can **quick-send** with one tap (the card is created with pre-filled defaults). When the user wants to adjust, they tap to **edit** — opening a pre-filled dialog where they can modify options before creating. Both paths start from the same suggestion chip. Quick-send is the default; edit is always available.

**Calendar context**: time-related suggestions show a compact calendar strip alongside each slot — surrounding events for that day, so the user sees how the proposed time fits into their schedule. This avoids switching to a calendar app to check. The strip is per-user (Private Constraints).

#### Principle 2: Chained Card Flow

Card resolution can trigger a follow-up suggestion. The system notices that one coordination decision naturally leads to another.

| Trigger                                       | Follow-up                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------- |
| RSVP declined (specific time)                 | Suggest time proposal with calendar-computed alternatives — offered to the decliner directly |
| Poll resolves ("mornings" wins)               | Suggest time proposal filtered to morning slots                                              |
| Time proposal resolves                        | Suggest location confirm if no location set                                                  |
| Task claim leaves items unclaimed at deadline | Surface unclaimed tasks to creator                                                           |

Chained suggestions use the same suggestion chip pattern — they are not autonomous. The user always taps to create.

#### Principle 3: Deadline Resolution

Every card has a deadline and transparent auto-resolve rules, shown on the card itself.

**Defaults by card type** (customizable by creator):

| Type             | Default deadline | Auto-resolve behavior                                   |
| ---------------- | ---------------- | ------------------------------------------------------- |
| Time proposal    | 12 hours         | Resolves to highest-voted slot                          |
| RSVP             | 24 hours         | Resolves with current Yes voters (even below threshold) |
| Poll             | 24 hours         | Winner at deadline wins                                 |
| Task claim       | None             | Stays open until claimed or manually closed             |
| Location confirm | 24 hours         | Majority-confirmed location wins                        |

**Display**: cards show "Closes in 8h" or "Closes Friday 18:00" — always visible, never hidden. When a card resolves by deadline, the resolution is logged as a system message in the conversation.

**Non-response**: if a member doesn't respond before deadline, the card proceeds without them. This is expected behavior, not a failure. See Communication Norms below.

#### Principle 4: Private Constraints

Each member sees personalized context on shared cards. Constraints are shown only to the person they belong to — never broadcast to the group.

Examples of per-member rendering on a time proposal card:

| Member | What they see (privately)                                              |
| ------ | ---------------------------------------------------------------------- |
| Lena   | "Your workday ends at 18:30, ~30 min buffer → ready by 19:00"          |
| Marcus | "You're free until 21:30 ✓"                                            |
| Priya  | "Your Garching meeting ends at 19:00. ~40 min commute → arrive ~19:40" |

**Source**: the LLM reads each member's calendar + profile `||hidden||` fields and generates a one-line contextual note per slot. These notes are computed at card creation time and stored in the card's `data` jsonb keyed by user ID (small groups only — membership is known at creation time).

#### Principle 5: Decline-and-Suggest

When a member declines or votes "No" on a coordination card, the system immediately offers alternatives — to both the decliner and the creator. Either party can act; whoever creates the follow-up card first resolves the suggestion for both.

**Example (RSVP for specific time)**:

1. Sarah creates RSVP: "Call tomorrow 14:00"
2. Tom taps "No"
3. System shows both Tom and Sarah: "📅 Suggest a different time? Tue 15:30 · Wed 14:00 · Thu 10:00" (computed from both calendars)
4. Tom taps "Wed 14:00" → time proposal card created
5. Sarah sees the card, confirms → resolved → calendar event created

Both parties are empowered to move forward — the system doesn't create a bottleneck on either side. This replaces the pattern where a decline dead-ends and the creator has to restart the negotiation manually.

---

### Communication Norms

Every card type and system behavior implicitly teaches users how coordination works in Mesh. These norms are explicit — they should be reflected in UI copy, onboarding, and documentation.

**Norm 1: Silence is not commitment.**
Cards have deadlines. If you don't respond, the card resolves without you — and that's okay. Nobody is obligated to respond. The system handles non-response gracefully (auto-close, proceed with responders). No chasing, no guilt.

**Norm 2: One tap is a real answer.**
When you tap "Yes" on an RSVP or vote on a time proposal, that's a commitment. It goes on your calendar. The system treats it as binding. This is what makes 1-tap coordination trustworthy.

**Norm 3: The system handles the awkwardness.**
Nobody has to chase non-responders. Nobody has to say "actually that doesn't work for me, sorry." Cards with deadlines and decline-and-suggest flows handle the social friction. "No" is a button, not a conversation.

**Norm 4: Cards are transparent decisions.**
Every card shows its rules: "Resolves when 3 people say Yes," "Closes Friday at 18:00," "First to claim gets it." No hidden mechanics. You always know what your tap does and when the decision will be made.

**Norm 5: You can change your mind (while active).**
Change your vote, withdraw your claim, switch your RSVP — until the card resolves or the deadline passes. After resolution, it's final (but someone can create a new card to renegotiate).

**Norm 6: AI-generated text is fine.**
Mesh is a coordination tool — the goal is getting people to the right place at the right time, not crafting artisanal messages. Pre-filled card titles, system summaries, and suggested text are LLM-generated and that's encouraged. What matters is that coordination content is concise, accurate, and actionable. See [0-vision.md](0-vision.md) "AI-Generated Text is Fine" for the full principle.

---

## 8. Membership

### Joining

- **2-person Spaces**: created when a connection is accepted (connection request is an Activity card; on acceptance, a Space is created)
- **Small Spaces**: invite or matching into the Space
- **Large Spaces**: join via link/QR, or matching surfaces it
- **Global Space**: virtual membership for all authenticated users (D4)

### Roles

Two roles: `member` and `admin`.

| Capability                                    | Admin | Member |
| --------------------------------------------- | ----- | ------ |
| Edit state text                               | yes   | no     |
| Approve state updates                         | yes   | no     |
| Manage members (invite, remove, change roles) | yes   | no     |
| Manage settings (posting-only, visibility)    | yes   | no     |
| Create posting-messages                       | yes   | yes    |
| Send messages (if enabled)                    | yes   | yes    |

The Space creator is the initial admin. Privileges can be granted to other members.

### `visible_from` for pre-invite conversation hiding

Each member has a `visible_from` timestamp. Messages before this timestamp are hidden from that member. This supports the drafting workflow: the creator iterates with the AI, then invites people who see only the polished state text and conversation from when they joined.

### Read tracking (D5)

Per-member cursor: `space_members.last_read_at`. Unread count = messages after this timestamp. A DB trigger on message INSERT increments `space_members.unread_count` for all members. The client reads this on load; the `activity:{userId}` Realtime channel broadcasts badge updates.

### Global Space virtual membership (D4)

The Global Space sets `is_global = true` (at most one Space). RLS policies treat it specially: all authenticated users have access without `space_members` rows. Read tracking for the Global Space uses client-local storage or a separate lightweight table.

---

## 9. Privileges

### Posting-only mode

Large Spaces commonly enable posting-only mode: only posting-messages are allowed, no regular messages. This keeps the conversation structured and manageable. Admins configure this via Space settings.

### Settings

Space settings (stored as `jsonb`):

| Setting        | Type    | Default   | Description                    |
| -------------- | ------- | --------- | ------------------------------ |
| `posting_only` | boolean | `false`   | Only posting-messages allowed  |
| `visibility`   | enum    | `private` | `private`, `public`, or `link` |
| `auto_accept`  | boolean | `true`    | New members auto-accepted      |
| `max_members`  | integer | `null`    | `null` = unlimited             |

### Cross-Space posting promotion

A posting in a small Space can be promoted to Explore as a new posting-message that **links back** to the original sub-Space. User-initiated, not automatic.

### Space archiving

- Admin can archive a Space via space-info-sheet (manual)
- Archived Spaces move to a collapsed "Archived" section in the Space list, filterable via chip
- Still readable, not prominent (rendered with reduced opacity)
- Admin can unarchive via space-info-sheet
- Posting lifecycle (status) is independent of Space archiving
- Auto-archive after 30 days of no messages planned (→ v0.9)

---

## 10. Key Design Decisions

Numbered for cross-reference. Full rationale in [designs/spaces-rewrite.md](designs/spaces-rewrite.md) Section 15.

| ID  | Decision                             | Summary                                                                                                                                                                |
| --- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Space <-> Posting relationship       | A posting lives _in_ a Space and can _spawn_ a sub-Space. Two FKs: `spaces.source_posting_id` -> `space_postings.id` and `space_postings.sub_space_id` -> `spaces.id`. |
| D2  | Sub-Space creation                   | Threads, not navigation. Inline collapsible by default; full-screen on tap. Always create sub-Space technically; rendering differs based on membership type.           |
| D3  | Inherited vs. independent membership | `inherits_members` flag on Space. Default `true`; transitions to `false` when outsiders join.                                                                          |
| D4  | Global Space virtual membership      | `is_global` flag; no `space_members` rows. RLS grants access to all authenticated users.                                                                               |
| D5  | Read tracking                        | Per-member cursor (`last_read_at` on `space_members`). DB trigger increments `unread_count`.                                                                           |
| D6  | Matches -> Activity cards            | `activity_cards` table replaces `matches`. Powers the Activity tab with match, invite, scheduling, connection request, RSVP, and join request card types.              |

---

## 11. Integration Points

| Spec                                                   | Integration                                                                                                                              |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| [1-matching.md](1-matching.md)                         | Candidate pool scoped by Space. Deep match receives parent state text as context.                                                        |
| [1-scheduling.md](1-scheduling.md)                     | Slot generation inherits Space context. Calendar overlap scoped to Space members.                                                        |
| [1-text-first.md](1-text-first.md)                     | Same editor everywhere. Slash commands work in all Spaces. `mesh:` syntax, `\|\|hidden\|\|`, `\|\|?\|\|` in state text and messages.     |
| [1-terminology.md](1-terminology.md)                   | "Space" (internal: Coordination Space), "Explore" (Global Space), "Posting" (posting-message). See terminology spec for canonical terms. |
| [1-ux.md](1-ux.md)                                     | Three-tab navigation (Spaces, Activity, Profile). Space list as main screen. Activity tab for personal cards.                            |
| [1-posting-access.md](1-posting-access.md)             | Composable access model applies to Space visibility and posting-message access.                                                          |
| [0-use-cases.md](0-use-cases.md)                       | All scenarios (Coffee Now, Hackathon, Recurring Practice, Course Project, Friday Dinner) traced through Spaces model.                    |
| [designs/spaces-rewrite.md](designs/spaces-rewrite.md) | Full data model, SQL schemas, RLS policies, migration path, implementation phases.                                                       |

---

## 12. Current Deviations

- **Inherited → independent transition**: `inherits_members` flag exists but no auto-transition when outsiders join via matching/invite. → v0.9
- **Old table cleanup**: Old `postings`, `conversations`, `messages`, `group_messages` tables still exist. → v0.9
- **Trade-off card type**: Not yet implemented. → v0.9
- **Card invalidation**: No automatic card invalidation from messages yet (Phase 2a/2b). Cards are manually resolved/cancelled. → v0.9
- **Auto-archive**: No 30-day auto-archive cron. Manual archive/unarchive by admin only. → v0.9
- **Quick-send suggestion path**: Suggestion chips open the edit dialog (pre-filled). The 1-tap quick-send path (create card directly with defaults) is not yet implemented. → v0.9
