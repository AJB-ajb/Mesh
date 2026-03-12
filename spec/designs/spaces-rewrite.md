# Spaces Rewrite

> Replaces the posting-centric model with a messenger-like interface where the fundamental unit is the **Space** (internally: Coordination Space / CS). This document captures the full concept before spec files are updated.

---

## 1. Why the Change

The current model treats the **activity posting** as the fundamental unit. Group chat is bolted on as a feature inside a posting. In practice, people coordinate through conversation — messages are the natural medium for working out what to do, who's in, and when to meet. The posting model forces users into a structured creation flow before they can start coordinating.

The Spaces model inverts this: **conversation is primary, structure is derived**. A Space is a conversation context. Coordination happens through messages. When structure is needed — matching, invites, lifecycle management — a posting-message adds it within the conversation. Users get the familiarity of a messenger with the coordination intelligence of Mesh.

### Isn't this going back to messaging?

The original vision (`0-vision.md`) argues that "messaging apps treat everything as a message — they can't help with the coordination." The Spaces model makes conversation primary again. This seems contradictory. The key difference:

- **Messaging apps**: conversation is _all there is_. The app has no understanding of what's being coordinated. Every negotiation is back-and-forth text.
- **Spaces**: conversation is the _medium_, but the system understands the structure within it. Posting-messages carry coordination properties (matching, capacity, lifecycle). Rich interactive cards replace back-and-forth with structured actions. The Space state text gives the system a machine-readable summary to match and act on.

The problem was never conversation itself — it was conversation _without structure_. Spaces keep conversation as the natural interface while embedding the coordination intelligence that plain messaging lacks. The vision's core argument (structured mechanisms replace negotiation rounds) is preserved; only the surface changes from "fill out a posting form" to "write in a conversation."

### What stays the same

- Text-first philosophy — text is the primary input, structure is extracted
- Matching pipeline — fast filter + deep LLM match
- Negotiation substitution — who/when/where/what/how many resolved by mechanisms, not back-and-forth
- `mesh:` link syntax, `||hidden||`, `||?||` — all work in Space state and messages
- Sequential/parallel invites
- Calendar overlap and scheduling intelligence
- Skills system and profile text

### What changes

- **Primary unit**: posting → Space (conversation context)
- **Navigation**: feed of postings → list of Spaces (like WhatsApp)
- **Group chat + coordination**: separate tabs → unified conversation
- **Posting creation**: standalone flow → message type within a Space
- **DMs**: separate feature → 2-person Spaces
- **Discover feed**: standalone page → the Global Space

---

## 2. Core Concept: Everything is a Space

A Space is a conversation context with:

- **Members** — who is in the Space
- **Conversation** — message history
- **State text** — a markdown document summarizing the Space's current purpose, context, and status (the "living document")
- **Settings** — privileges, visibility, posting-only mode, etc.
- **Parent Space** (optional) — for nesting

Every conversation context in Mesh is a Space:

| What                         | Space form                                        |
| ---------------------------- | ------------------------------------------------- |
| DM with a connection         | 2-person Space (context: just the two people)     |
| Small group coordination     | Small Space (3-8 members)                         |
| Hackathon, course, community | Large Space (many members, public or invite-link) |
| Global discovery             | The Global Space (everyone is a member)           |

There is no separate "DM" or "channel" or "group" entity. The behavior of a Space emerges from its size, settings, and context.

---

## 3. Unified Space UX

There is **one Space layout** that works at every size. No hard distinction between "small" and "large" Spaces. Instead, features are progressively enabled or disabled based on size and admin settings.

### The single Space view

Every Space has the same structure:

- **Header**: Space name, info, settings
- **State text**: collapsible summary/description
- **Conversation timeline**: messages, posting-cards, and rich interactive cards in one stream
- **Compose area**: text input with Message/Posting toggle

### Progressive features by size

| Feature                       | 2-person     | Small (~3-10) | Medium (~10-50)       | Large (~50+)         |
| ----------------------------- | ------------ | ------------- | --------------------- | -------------------- |
| Regular messages              | yes          | yes           | yes (can be disabled) | admin-configurable   |
| Posting-messages              | yes          | yes           | yes                   | yes                  |
| Sub-Space browsing            | n/a          | optional      | useful                | primary navigation   |
| Search & filter               | minimal      | optional      | prominent             | prominent            |
| Matching on sub-Spaces        | no           | no            | optional              | yes                  |
| Notification default          | all activity | all activity  | muted for most        | digest               |
| Conversation muted by default | no           | no            | no                    | yes (for non-admins) |
| Posting-only mode             | no           | no            | optional toggle       | common default       |

The key: **admins configure what makes sense for their Space.** A 50-person study group might keep messages enabled. A 200-person hackathon might go posting-only. The system suggests defaults based on member count, but the admin decides.

### The Global Space

- **Everyone is a member by default.**
- **Posting-only.** No regular messages — it's a stream of posting-messages, functionally replacing the current Discover feed.
- **Browsable, filterable, sortable.** Chip filters (category, location, etc.), search, sort by match score or recency.
- **Matching surfaces relevant postings.** Not a raw chronological feed — the system highlights what's relevant to each user.
- **Always pinned** at the top of the Space list.

---

## 4. Messages and Posting-Messages

### Regular messages

Standard chat messages in the Space conversation. Markdown text. Available in small Spaces (disabled in posting-only Spaces).

### Posting-messages

A special message type that adds structure to the conversation. Created via an explicit toggle in the compose area.

A posting-message:

- Appears in the conversation as a structured card (title, text preview, status, CTA)
- Has coordination properties: matching enabled, capacity, deadline, auto-accept, invites
- Can spawn a sub-Space for its own coordination (the sub-Space inherits context from the parent)
- Has a lifecycle: open → active → closed
- Is essentially the current "posting" entity, embedded in a conversation

### Compose area

The compose area in a Space has:

- Text input (same markdown editor as today)
- A toggle: **Message** | **Posting**
- When set to Posting: additional controls surface (capacity, visibility, deadline — same as current posting creation, but inline)
- Send creates either a regular message or a posting-message based on the toggle

In posting-only Spaces, the toggle is locked to Posting — there is no Message option.

---

## 5. Space State Text

Every Space has a **state text** — a markdown document that serves as the living summary of the Space's purpose, context, and current status. This corresponds to the current "posting text" but is more general.

### Properties

- **Manually editable** by privileged members (always). Same editor as today, with `/clean`, `/format`, etc.
- **LLM-suggested updates**: triggered on-demand via a `/summarize` command, or when a coordination card resolves (e.g., time confirmed, RSVP complete). The LLM proposes a state text update; the user approves with one tap. Automatic suggestions may be added later once the right cadence is understood, but the initial version is explicit/on-demand.
- **Hidden content**: `||hidden||` and `||?||` syntax works in state text. Hidden content is revealed only to members (not visible when the Space is shown to outsiders).
- **Source of truth**: the state text is what new members, outsiders, and the matching system see. The conversation is the history; the state text is the current snapshot.

### Who edits the state text

- **Privileged members** can directly edit the state text and approve LLM-suggested updates.
- **In small Spaces**: typically the creator, but privileges can be shared.
- **In large Spaces**: organizers/admins only. Regular members' messages don't trigger state updates.

### Pre-invite drafting workflow

A user can create a Space (just themselves in it), work out the context through conversation with the AI, approve state text updates as they iterate, and only then invite people or make the Space public. The pre-invite conversation is **hidden by default** from people who join later — they see the state text (the polished output), not the drafting process.

---

## 6. Privileges

Spaces have a simple privilege model:

| Privilege                   | Default holder                                       | Description                                                 |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| **Edit state text**         | Creator                                              | Directly edit the Space's state text                        |
| **Approve state updates**   | Creator                                              | Approve LLM-suggested state text changes                    |
| **Manage members**          | Creator                                              | Invite, remove, change member privileges                    |
| **Manage settings**         | Creator                                              | Change Space settings (posting-only mode, visibility, etc.) |
| **Create posting-messages** | All members                                          | Create posting-messages in the Space                        |
| **Send messages**           | All members (small) / disabled (large, posting-only) | Send regular messages                                       |

Privileges can be granted to other members. In large Spaces, the creator functions as an organizer/admin.

---

## 7. Navigation

### Bottom tab bar (mobile)

Three tabs:

| Position | Tab          | Content                                                                            |
| -------- | ------------ | ---------------------------------------------------------------------------------- |
| Left     | **Spaces**   | Space list — sorted by last activity, pinnable, filterable with chips              |
| Middle   | **Activity** | Personal action cards — matches, invites, scheduling requests, connection requests |
| Right    | **Profile**  | Profile editor, settings, calendar                                                 |

### Spaces tab (main screen)

The Space list — a list of the user's Spaces, sorted by last activity:

- **Sorted by last activity** (newest first), like a messenger
- **Pinnable**: users can pin Spaces to the top (e.g., a course project they check daily)
- **Filterable**: chip filters (All, DMs, Groups, Public, Pinned — similar to WhatsApp)
- **Global Space pinned at top** (always)
- **Unread badges**: unread message/posting count per Space
- **Preview**: last message/posting preview + timestamp, like a messenger

### Activity tab

The personal inbox of things that need your response. Contains **personal cards** — actionable items generated by Mesh's intelligence:

- **Match cards**: "New posting matches you" — with Join / Pass buttons
- **Invite cards**: "Alex invited you to [Space]" — with context + Join / Decline
- **Scheduling cards**: personalized time proposals ("Your meeting ends at 19:00, you'd arrive ~19:30")
- **Connection requests**: accept / decline
- **RSVP requests**: recurring session notifications

Each card has inline actions. Tapping an action (e.g., Join) lands you directly in the relevant Space. The Activity tab is the primary surface for Mesh's coordination intelligence — matching, scheduling, and invites all appear here as actionable cards rather than passive notifications.

Activity tab + per-Space badges work together:

- **Activity tab**: aggregated triage view — "what needs my response across all Spaces?"
- **Per-Space badges**: contextual view — "what's happening in this specific Space?"

### Profile tab

Profile editor, settings, calendar, connected accounts. Same content as current Profile + Settings pages, consolidated.

### Desktop sidebar

Desktop equivalent of the bottom bar: Spaces, Activity, Profile as sidebar sections. Space list is the main content area.

### What replaces what

| Current                     | Spaces model                                                      |
| --------------------------- | ----------------------------------------------------------------- |
| Discover page               | Global Space (pinned at top of Space list)                        |
| Posts page (Created filter) | Spaces where user created posting-messages (filterable)           |
| Posts page (Joined filter)  | Spaces user is a member of (the Space list itself)                |
| Connections page (DMs)      | 2-person Spaces in the Space list (filterable via DMs chip)       |
| Connections page (requests) | Connection requests → Activity tab                                |
| Active page                 | Spaces with active coordination (all Spaces with recent activity) |
| Notifications bell          | Activity tab (replaces the bell dropdown)                         |

### Adding connections

Adding connections (search, QR, share link) moves to a dedicated action (e.g., a button in the Space list header or a "New Space" flow). When a connection is added, a 2-person Space is created for them.

---

## 8. Entering a Space

What you see when you tap a Space depends on its size:

### Small Space (<~10 members)

Primary view: **conversation**. The conversation is front and center. State text is accessible via a header area or swipe/tap gesture. Posting-messages appear inline in the conversation as structured cards.

```
┌─────────────────────────┐
│ Space Name    [i] [...] │  ← header: name, info, settings
├─────────────────────────┤
│ State text (collapsed)  │  ← tap to expand / edit
├─────────────────────────┤
│                         │
│ [message]               │
│ [message]               │
│ [posting-card]          │  ← posting-message rendered as card
│ [message]               │
│                         │
├─────────────────────────┤
│ [text input] [M|P] [→] │  ← compose: message/posting toggle
└─────────────────────────┘
```

### Large Space (~10+ members, posting-only)

Primary view: **sub-Space list**. A browsable, filterable, matchable directory of posting-messages and their spawned sub-Spaces.

```
┌─────────────────────────┐
│ Space Name    [i] [...] │
├─────────────────────────┤
│ State text (summary)    │  ← the Space's description / purpose
├─────────────────────────┤
│ [filter chips] [search] │
├─────────────────────────┤
│ [posting-card]          │
│ [posting-card]          │  ← sub-Spaces, sorted by relevance/recency
│ [posting-card]          │
│                         │
├─────────────────────────┤
│ [compose posting] [→]   │  ← posting-only compose
└─────────────────────────┘
```

Conversation (if enabled for this member) is behind a tab or button — not the default view.

---

## 9. Sub-Spaces and Nesting

A posting-message in a Space can spawn a **sub-Space**. The sub-Space inherits context from its parent:

| Inherited         | Behavior                                                  |
| ----------------- | --------------------------------------------------------- |
| **Topic/context** | LLM reads parent state text when processing the sub-Space |
| **Location**      | Default from parent, overridable                          |
| **Time scope**    | Constraining (e.g., hackathon dates)                      |
| **Visibility**    | Private parent → private children                         |

### When sub-Spaces are created

- **Large Spaces**: posting-messages always spawn sub-Spaces (coordination happens there, not in the parent)
- **Small Spaces**: posting-messages can resolve inline OR spawn sub-Spaces. For lightweight coordination ("meet Thursday?"), inline resolution is sufficient. For substantial new activities, a sub-Space is natural.
- **Acceptance of a posting**: when someone joins a posting-message, they enter the sub-Space (if one exists) or the coordination happens in the parent conversation.

### Nesting depth

Typically one level: Space → sub-Space. A hackathon might go Space → team sub-Space → but within the team sub-Space, coordination is just conversation (no further nesting needed). No artificial depth limit, but the UX is designed for one level being the common case.

---

## 10. Rich Interactive Cards

Coordination in Spaces happens through **rich interactive cards** — structured messages embedded in the conversation that members interact with via taps instead of writing messages. This is the primary mechanism for saving back-and-forth.

### Card types

| Type                 | Content                                          | Interaction                                           | Resolution                                        |
| -------------------- | ------------------------------------------------ | ----------------------------------------------------- | ------------------------------------------------- |
| **Time proposal**    | 3-4 time slots from calendar overlap             | Each member taps preferred slot(s). Votes shown live. | Auto-confirms when all/enough members align       |
| **RSVP**             | Event/session description + time                 | Yes / No / Maybe buttons                              | Count shown live, threshold triggers confirmation |
| **Poll**             | Multiple-choice question                         | Tap to vote                                           | Results visible to all                            |
| **Task claim**       | "Who handles X?" with member list                | Tap "I'll do it"                                      | Claimed → assigned                                |
| **Location confirm** | Map pin + address                                | Confirm / Suggest different                           | Confirmed when agreed                             |
| **Invite response**  | Space/posting description + match context        | Join / Decline                                        | Joins Space or passes                             |
| **Trade-off**        | "No perfect option — pick one" with alternatives | Creator/admin picks                                   | Selected option confirmed                         |

### Where cards live

**Shared cards** — visible to all Space members, in the conversation timeline:

- Time proposals, RSVPs, polls, task claims, location confirms
- Everyone sees them, everyone can interact
- Results update live as members tap

**Personal cards** — only for you, in the **Activity tab**:

- Match notifications, invite cards, personalized scheduling info
- Your private action queue
- Tapping an action lands you in the relevant Space

### Cards are living objects

Cards update when context changes. They are not frozen — they reflect the current state of coordination. Only **active** (unresolved) cards can be updated. Once a card is confirmed/resolved, it's frozen.

**Easy actions (taps)** update cards immediately:

```
Alex taps "Tue 18:00" → card shows Alex ✓ on that slot
Lena taps "Tue 18:00" → card shows 2/4 on that slot
```

**Messages can invalidate active cards.** When someone writes a message that changes the assumptions behind an active card, the system detects the conflict and suggests an update. This is scoped: the LLM only checks incoming messages against currently active (unresolved) cards in the Space — not all messages against all historical cards.

```
┌─────────────────────────────────────────────────┐
│ Conversation timeline                           │
│                                                 │
│ Alex: "Planning call this week?"                │
│                                                 │
│ [📅 Time proposal]                               │
│  ○ Tue 18:00 — Alex ✓, Lena ✓                  │
│  ○ Thu 18:30 — Alex ✓                           │
│  ○ Fri 17:00 —                                  │
│  Leading: Tue 18:00 (2/4)                       │
│                                                 │
│ Kai: "Tuesday won't work, forgot about physio"  │
│                                                 │
│ [📅 Time proposal · updated]                     │
│  Accounting for Kai's conflict:                 │
│  ○ Tue 19:30 — all 4 free                       │
│  ○ Thu 18:30 — Alex ✓, Kai free                 │
│  ○ Fri 17:00 — all 4 free                       │
│  Previous votes carried forward where unchanged │
│                                                 │
│ Priya taps Tue 19:30 ✓                          │
│ Kai taps Tue 19:30 ✓                            │
│                                                 │
│ ✅ Confirmed: Tue 19:30. Calendar events created. │
└─────────────────────────────────────────────────┘
```

### Update mechanics

| Trigger                                          | Card behavior                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------ |
| **Tap on card** (easy action)                    | Immediate in-place update — vote tallied, result shown                         |
| **Message that changes context** (minor)         | In-place update with "updated" marker + explanation of what changed            |
| **Message that invalidates all options** (major) | Old card marked superseded, new card generated below the message               |
| **Explicit card actions**                        | Buttons on the card itself: "Change my vote", "Cancel proposal", "Add options" |
| **No activity for N hours**                      | Optional nudge: "Still need to pick a time — 2/4 have voted"                   |

### Message-to-card invalidation: scoping

This is a hard problem. The approach:

1. **Only active cards are candidates.** The system maintains a small set of currently unresolved cards per Space (typically 0-2). Resolved/confirmed cards are ignored.
2. **Check is per-message, narrow context.** On each new message, the LLM receives: the message text + the active card(s) state. It answers: "does this message change any assumption behind these cards?" Binary decision, not open-ended generation.
3. **Phase 1: explicit actions only.** Cards have buttons for "I can't make this" / "Change my vote" / "Cancel." Free-text detection is Phase 2.
4. **Phase 2: free-text detection.** LLM reads messages against active cards. False positives (wrongly invalidating) are worse than false negatives (missing a conflict), so the system should suggest an update that the user confirms rather than auto-updating.

### Who can trigger card updates via messages

- **Small Spaces (all members)**: any member's message can trigger a card update. Everyone's input matters.
- **Large Spaces (privileged members)**: only admin/organizer messages trigger card updates. Regular members interact via taps on shared cards.
- **1:1 Spaces**: both people can trigger updates equally.

### Card detection

The system detects coordination moments from messages using the LLM:

- "Planning call this week?" → time proposal card
- "Who's coming Tuesday?" → RSVP card
- "Where should we meet?" → location/poll card
- "Can someone handle the frontend?" → task claim card

The system suggests the card; the message sender confirms with one tap (or the card auto-generates if the intent is clear). This keeps the human in control without requiring them to use a specific button for every coordination action.

### Back-and-forth savings

| Coordination pattern  | Without Mesh              | With rich cards   | Mechanism                                         |
| --------------------- | ------------------------- | ----------------- | ------------------------------------------------- |
| Time negotiation      | 6-8 messages              | 1 card + taps     | Calendar overlap → time proposal card             |
| Availability check    | 4-10+ messages            | 0 messages (auto) | Calendar pre-filter, invite only available people |
| Location exchange     | 4-5 messages              | 0 messages        | `\|\|hidden\|\|` in state text, revealed on join  |
| Role/task assignment  | 6-8 messages              | 1 card + 1 tap    | Task claim card                                   |
| RSVP (recurring)      | 3-5 messages per instance | 1 card + 1 tap    | RSVP card                                         |
| Confirmation/reminder | 2-3 messages              | 0 (auto)          | Calendar event created on confirmation            |
| Renegotiation         | 3-12 messages             | 1 updated card    | Message triggers card update with new options     |
| Introduction/context  | 6+ messages               | 0 messages        | Match explanation on personal card + state text   |

---

## 11. Matching in the Space Model

The matching pipeline (fast filter + deep LLM match) transfers directly. The candidate pool is scoped by Space:

| Context                   | Candidate pool                     |
| ------------------------- | ---------------------------------- |
| Posting in Global Space   | All users                          |
| Posting in a public Space | Space members                      |
| Posting in a small Space  | No matching — broadcast to members |

### Deep matching gets richer context

The LLM receives the parent Space's state text as additional context, improving match quality (same as the nested postings spec).

### Discovery within large Spaces

When a user opens a large Space, matching surfaces the most relevant sub-Spaces for them. "Welcome to XHacks! Here are 3 teams looking for someone with your skills." Same engine, different trigger — matching runs on browse, not just on posting creation.

---

## 12. Notifications

Three tiers, adapted for the Space model:

### Tier 1: Needs your response

- Invited to a Space or posting
- Matched with a relevant posting in a Space you're in
- RSVP needed (time confirmation, task assignment)
- Someone accepted/declined your posting

Delivery: badge + optional push.

### Tier 2: Space activity (small Spaces)

- New messages in a small Space
- New posting-messages in a Space
- Someone joined your Space

Delivery: unread badge on the Space in the list.

### Tier 3: Large Space activity

- New posting-messages in a large Space
- Weekly summary of Space activity

Delivery: daily/weekly digest. Not real-time.

---

## 13. How Use Cases Transfer

Each use case traced through the full flow: posting → matching → personal cards → joining → shared cards → coordination → resolution.

### Coffee Now (spontaneous)

1. User opens Global Space, creates posting-message: "Grabbing coffee near Marienplatz, anyone? Next hour."
2. Matching runs. Top match (Lena) sees a **personal match card** in her Activity tab: posting text, match score, match explanation, **Join / Pass**.
3. Lena taps **Join** → sub-Space created (or existing DM Space used for 1:1). System posts a **shared time proposal card**: "You're both free now. Meet at 14:15?" with **Confirm / Suggest different**.
4. Both confirm. `||hidden||` content (exact cafe, "I'll be at the table by the window") auto-reveals. Calendar event created.

**Total: 2 taps after the initial post. Replaces ~15 messages.**

### Hackathon (XHacks)

1. Organizer creates "XHacks 2026" Space (public, join via QR). 200 join. Admin enables posting-only mode.
2. Participant creates posting-message: "Accessibility checker — need designer + backend dev." Spawns a sub-Space.
3. Matching runs on 200 channel members. Top matches see **personal match cards** in Activity tab with role-specific explanations ("You matched as: designer — your Figma experience").
4. Three people join the sub-Space. Inside, someone writes "Planning call this week?"
5. System generates **shared time proposal card** from 4-way calendar overlap. Members tap preferred slots. Confirmed.
6. Later: "Who handles the Figma mockups before Saturday?" → **task claim card**. Designer taps "I'll do it."

**Nesting: Global → XHacks Space → Team sub-Space. All coordination via conversation + cards.**

### Recurring Spanish Practice

1. "Weekly Spanish Practice" Space (public). People join over time.
2. Each week, organizer (or system via `/recur`) posts a posting-message: "This Tuesday's session."
3. **Shared RSVP card** attached: Yes / No / Maybe. Pre-populated time (18:30) from previous sessions.
4. Members tap. Card shows "4/5 coming." If the usual time doesn't work for enough people, system generates an **updated time proposal card** with alternatives.
5. Someone writes "Can we start at 19:00 this week? I have a late meeting." → RSVP card **updates in-place** with the new time, previous votes reset with note "Time changed to 19:00 — please re-confirm."

**No sub-Space needed — resolves in the parent Space conversation.**

### Course Project

1. "Data Structures project" Space. Team of 3 forms via matching.
2. "When should we do our weekly sync?" → **shared recurring time proposal card** showing best weekly slots from 3-way calendar overlap. Members vote. Winning slot → recurring calendar event.
3. Each week: **RSVP card** auto-posts. "Weekly sync tomorrow 17:00. Coming?"
4. One week, Priya writes "Can't make Thursday, exam prep." → RSVP card updates. If quorum still met, session proceeds. If not, system generates **reschedule card** with alternatives.
5. "Working session for Assignment 3 this weekend?" → **time proposal card** scoped to weekend slots. "Library or remote?" → **poll card**.
6. State text evolves: project description, deadline, task division, meeting schedule — updated via LLM suggestions approved by members.

### Friday Dinner

1. Alex creates posting-message in a friends Space or Global Space: "Friday dinner, Italian, central Munich, ~4 people."
2. Invites sent as **personal cards** to connections. Each card is personalized: Priya's shows "Your Garching meeting ends at 19:00. You'd arrive ~19:40." with **Join (I'll be ~10 min late) / Decline**.
3. As people accept → sub-Space created. System posts a **shared time proposal card**: "19:30 works for all 4. Confirm?"
4. If no perfect overlap → **trade-off card**: "A: without Priya, 19:00-21:00. B: without Lena, 20:00-22:30. C: Saturday, all 4." Alex picks.
5. Confirmed. `||hidden||` reveals exact restaurant + "I'll make a reservation."

### Quick Call

1. Open connection's DM Space → toggle to Posting → "Quick call about the API redesign? 15 min." → send.
2. Sub-Space created instantly (lightweight — just the two people + the topic as state text). System posts **shared time proposal card** with slots from both calendars. Notes: "14:45 accounts for Alex's current call possibly running over."
3. Kim taps **15:00**. Calendar event created. Done.

Sub-Space creation should be near-instant — as fast as sending a message. Conceptually, a quick call _is_ a new coordination context, even if it's tiny. The sub-Space keeps the DM conversation clean and gives the call its own history (useful if it leads to follow-up). The posting toggle should be the default way to initiate any coordination, even lightweight ones — this keeps the model consistent.

### Private Event Planning

1. Create a Space (just you). Write messages working out the idea with the AI: "Board game night, maybe 4-5 people, this Saturday. Should we do it at my place or a cafe?"
2. AI responds, helps refine. Suggests state text update: "Board game night — Saturday 19:00, Alex's place, 4-5 people. Bring your favorite game. Snacks provided." Approve with one tap.
3. Invite friends. They see the state text (polished description), not the drafting conversation.
4. In the Space, system posts **shared RSVP card**. Friends tap Yes/No. **Poll card**: "Which games? [Catan] [Codenames] [Wingspan] [Other]."

---

## 14. Terminology

| Internal term           | User-facing term                                       | Description                                                                               |
| ----------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| Coordination Space (CS) | **Space**                                              | The fundamental unit — a conversation context with members, state, and coordination tools |
| CS state text           | **Space description** or just shown without a label    | The living markdown document summarizing the Space                                        |
| Posting-message         | **Posting**                                            | A structured message that adds coordination properties (matching, capacity, lifecycle)    |
| Regular message         | **Message**                                            | A standard chat message                                                                   |
| Sub-Space               | **Space** (nested)                                     | A Space spawned from a posting-message, inheriting parent context                         |
| Global Space            | **Explore**                                            | The Space everyone is in — the discovery surface                                          |
| 2-person Space          | Shown as the connection's name                         | A DM context — no special label needed                                                    |
| Posting-only mode       | No user-facing label (it's just how large Spaces work) | Mode where only posting-messages are allowed                                              |

---

## 15. Data Model

### Replaces: nested postings model

The Spaces model fully replaces the nested postings spec (`1-nested-postings.md`). `parent_posting_id` and `context_identifier` are superseded by `parent_space_id`. The existing `postings`, `conversations`, `messages`, `group_messages`, and related tables are **recreated as new tables** — consistent terminology in the schema avoids confusion for both developers and agentic coding tools.

**Retained:** `profiles`, `friendships`, `skill_nodes`, `profile_skills`, `availability_windows`, `calendar_connections`, `calendar_busy_blocks`, `notifications`, `feedback`, `templates`.

**Dropped and replaced:** `postings`, `applications`, `friend_asks`, `matches`, `conversations`, `messages`, `group_messages`, `group_message_reads`, `meeting_proposals`, `meeting_responses`, `bookmarks`.

---

### Design Decisions

#### D1: Space ↔ Posting relationship

A posting lives _in_ a Space and can _spawn_ a sub-Space. Two links connect them:

```
spaces.source_posting_id  → space_postings.id   (the posting that spawned this Space)
space_postings.sub_space_id → spaces.id          (the sub-Space this posting spawned)
```

Both exist because: not all sub-Spaces come from postings (manual creation), and not all postings spawn sub-Spaces (lightweight inline resolution).

#### D2: Sub-Space creation — threads, not navigation

Sub-Spaces are rendered as **threads anchored to their posting-message** in the parent Space conversation. They don't require navigating away.

- **Collapsed by default**: "3 replies" under the posting card
- **Expandable inline**: thread opens below the card, within the parent conversation
- **Full-screen on tap**: for long threads or complex coordination
- **Coordination cards** (time proposals, RSVPs) live in the thread, not the parent timeline

Creation timing:

- **Posting-only Spaces**: sub-Space created immediately on posting-message send
- **Small Spaces**: sub-Space created on first reply or first join — posting resolves inline until then

#### D3: Inherited vs. independent membership

Sub-Spaces have two flavors:

| Flavor                    | `inherits_members` | Membership                                       | When                                                              |
| ------------------------- | ------------------ | ------------------------------------------------ | ----------------------------------------------------------------- |
| **Inherited thread**      | `true`             | Same as parent — no `space_members` rows needed  | Default. Coordination within an existing group.                   |
| **Independent sub-Space** | `false`            | Own `space_members` rows, can differ from parent | When outsiders join (matching), or creator restricts to a subset. |

Default: `inherits_members = true`. Transitions to `false` when:

- Someone outside the parent Space joins via matching or invite link
- The creator explicitly makes it public/discoverable
- Membership is explicitly restricted to a subset

This is a settable attribute — admins can override the default.

#### D4: Global Space — virtual membership

The Global Space doesn't create `space_members` rows for every user. Instead:

```sql
spaces.is_global: boolean (default false, at most one true)
```

RLS policies treat it specially: if `space.is_global = true`, all authenticated users have access. This avoids N rows for N users and scales cleanly.

For the Global Space, read tracking uses client-local storage or a separate lightweight table (e.g., `global_space_reads` with just `user_id` + `last_read_at`).

#### D5: Read tracking — per-member cursor

Instead of per-message read booleans or a separate reads table:

```
space_members.last_read_at: timestamptz
```

Unread count = `SELECT count(*) FROM space_messages WHERE space_id = X AND created_at > member.last_read_at`. Updated when the user views the Space.

Badge counts for the Space list: a DB trigger on `space_messages` INSERT increments `space_members.unread_count` for all members of that Space. The client reads this on load and the `activity:{userId}` Realtime channel broadcasts updates.

#### D6: Matches → Activity cards

The current `matches` table (pre-computed match results) is replaced by `activity_cards` — the table powering the Activity tab. Match results, invites, scheduling suggestions, and connection requests are all personal cards.

---

### Tables

#### `spaces`

```sql
create table spaces (
  id            uuid primary key default gen_random_uuid(),
  name          text,
  state_text    text,                                         -- markdown, the "living document"
  parent_space_id uuid references spaces(id) on delete cascade,
  source_posting_id uuid,                                     -- FK added after space_postings created
  created_by    uuid not null references profiles(user_id),
  is_global     boolean not null default false,               -- at most one true
  inherits_members boolean not null default false,            -- true = membership falls through to parent
  settings      jsonb not null default '{}',                  -- posting_only, visibility, etc.
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes
create index idx_spaces_parent on spaces(parent_space_id) where parent_space_id is not null;
create unique index idx_spaces_global on spaces(is_global) where is_global = true;  -- at most one
```

**`settings` jsonb structure:**

```jsonc
{
  "posting_only": false, // only posting-messages allowed
  "visibility": "private", // private | public | link
  "auto_accept": true, // new members auto-accepted
  "max_members": null, // null = unlimited
}
```

#### `space_members`

```sql
create table space_members (
  space_id      uuid not null references spaces(id) on delete cascade,
  user_id       uuid not null references profiles(user_id) on delete cascade,
  role          text not null default 'member' check (role in ('member', 'admin')),
  joined_at     timestamptz not null default now(),
  visible_from  timestamptz not null default now(),  -- messages before this hidden
  last_read_at  timestamptz not null default now(),
  unread_count  integer not null default 0,
  muted         boolean not null default false,
  pinned        boolean not null default false,
  pin_order     integer,
  primary key (space_id, user_id)
);

-- Indexes
create index idx_space_members_user on space_members(user_id);
create index idx_space_members_pinned on space_members(user_id) where pinned = true;
```

**Role semantics:** `admin` auto-grants: edit state text, approve state updates, manage members, manage settings. `member` gets: send messages (if enabled), create posting-messages.

#### `space_messages`

```sql
create table space_messages (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references spaces(id) on delete cascade,
  sender_id     uuid references profiles(user_id),            -- null for system messages
  type          text not null check (type in ('message', 'posting', 'system', 'card')),
  content       text,                                          -- markdown (null for card-only messages)
  posting_id    uuid,                                          -- FK added after space_postings created
  card_id       uuid,                                          -- FK added after space_cards created
  created_at    timestamptz not null default now()
);

-- Indexes
create index idx_space_messages_space on space_messages(space_id, created_at);
create index idx_space_messages_posting on space_messages(posting_id) where posting_id is not null;
```

**Trigger:** on INSERT, increment `space_members.unread_count` for all members of this Space (except the sender). For inherited-membership sub-Spaces, walk up to the parent and increment there.

#### `space_postings`

```sql
create table space_postings (
  id                uuid primary key default gen_random_uuid(),
  space_id          uuid not null references spaces(id) on delete cascade,
  sub_space_id      uuid references spaces(id),               -- the thread/sub-Space spawned
  created_by        uuid not null references profiles(user_id),
  text              text not null,                              -- markdown posting content
  category          text,
  tags              text[],
  capacity          integer default 1,
  team_size_min     integer default 1,
  deadline          timestamptz,
  activity_date     timestamptz,
  visibility        text not null default 'public' check (visibility in ('public', 'private')),
  auto_accept       boolean not null default false,
  status            text not null default 'open' check (status in ('open', 'active', 'closed', 'filled', 'expired')),
  extracted_metadata jsonb not null default '{}',              -- LLM-extracted fields
  embedding         vector(1536),                               -- pgvector for semantic matching
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Add the FK from spaces back to space_postings
alter table spaces add constraint fk_spaces_source_posting
  foreign key (source_posting_id) references space_postings(id) on delete set null;

-- Add the FK from space_messages to space_postings
alter table space_messages add constraint fk_messages_posting
  foreign key (posting_id) references space_postings(id) on delete set null;

-- Indexes
create index idx_space_postings_space on space_postings(space_id, created_at);
create index idx_space_postings_status on space_postings(space_id, status);
create index idx_space_postings_embedding on space_postings using ivfflat (embedding vector_cosine_ops);
```

**Skills:** `posting_skills` is retained — just re-pointed to `space_postings.id` instead of old `postings.id`.

#### `space_cards` (Phase 2)

```sql
create table space_cards (
  id            uuid primary key default gen_random_uuid(),
  space_id      uuid not null references spaces(id) on delete cascade,
  message_id    uuid not null references space_messages(id) on delete cascade,
  type          text not null check (type in (
    'time_proposal', 'rsvp', 'poll', 'task_claim', 'location', 'trade_off'
  )),
  status        text not null default 'active' check (status in ('active', 'resolved', 'superseded')),
  data          jsonb not null default '{}',   -- options, votes, results (type-specific)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Add the FK from space_messages to space_cards
alter table space_messages add constraint fk_messages_card
  foreign key (card_id) references space_cards(id) on delete set null;

-- Index for finding active cards in a Space (for invalidation checks)
create index idx_space_cards_active on space_cards(space_id) where status = 'active';
```

**`data` jsonb examples:**

Time proposal:

```jsonc
{
  "options": [
    {
      "slot": "2026-03-17T18:00",
      "label": "Tue 18:00",
      "votes": ["user_a", "user_b"],
    },
    { "slot": "2026-03-19T18:30", "label": "Thu 18:30", "votes": ["user_a"] },
  ],
  "resolved_slot": null,
  "calendar_event_ids": [],
}
```

RSVP:

```jsonc
{
  "event_time": "2026-03-17T18:30",
  "responses": { "user_a": "yes", "user_b": "no", "user_c": "maybe" },
  "threshold": 3,
}
```

#### `space_join_requests`

```sql
create table space_join_requests (
  id            uuid primary key default gen_random_uuid(),
  posting_id    uuid not null references space_postings(id) on delete cascade,
  user_id       uuid not null references profiles(user_id) on delete cascade,
  status        text not null default 'pending' check (status in (
    'pending', 'accepted', 'rejected', 'withdrawn', 'waitlisted'
  )),
  responses     jsonb,                          -- acceptance card Q&A responses
  waitlist_position integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (posting_id, user_id)
);
```

#### `space_invites`

Replaces `friend_asks`. Handles sequential and parallel invites within Spaces.

```sql
create table space_invites (
  id              uuid primary key default gen_random_uuid(),
  posting_id      uuid not null references space_postings(id) on delete cascade,
  created_by      uuid not null references profiles(user_id),
  mode            text not null check (mode in ('sequential', 'parallel')),
  ordered_list    uuid[] not null,              -- ordered list of invitees
  current_index   integer not null default 0,   -- progress (sequential mode)
  concurrent_max  integer not null default 1,   -- N-concurrent slots (sequential)
  pending         uuid[] not null default '{}', -- currently outstanding invites
  declined        uuid[] not null default '{}', -- who declined
  status          text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

#### `activity_cards`

Personal action cards powering the Activity tab. Replaces `matches` table.

```sql
create table activity_cards (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(user_id) on delete cascade,
  type          text not null check (type in (
    'match', 'invite', 'scheduling', 'connection_request', 'rsvp', 'join_request'
  )),
  space_id      uuid references spaces(id) on delete cascade,
  posting_id    uuid references space_postings(id) on delete cascade,
  from_user_id  uuid references profiles(user_id),             -- who triggered this card
  data          jsonb not null default '{}',                    -- match score, explanation, context
  status        text not null default 'pending' check (status in ('pending', 'acted', 'dismissed', 'expired')),
  created_at    timestamptz not null default now(),
  acted_at      timestamptz
);

-- Indexes
create index idx_activity_cards_user on activity_cards(user_id, status, created_at desc);
create index idx_activity_cards_pending on activity_cards(user_id) where status = 'pending';
```

---

### RLS Policies

| Table                 | SELECT                                                               | INSERT                        | UPDATE                                             | DELETE                 |
| --------------------- | -------------------------------------------------------------------- | ----------------------------- | -------------------------------------------------- | ---------------------- |
| `spaces`              | Member, or `is_global`, or `settings->visibility = 'public'`         | Authenticated                 | Admin                                              | Admin                  |
| `space_members`       | Member of the Space                                                  | Admin, or self (for join)     | Self (muted, pinned, last_read_at) or Admin (role) | Admin, or self (leave) |
| `space_messages`      | Member + `created_at >= visible_from`, or inherited member of parent | Member (if messaging enabled) | Sender (edit own?)                                 | —                      |
| `space_postings`      | Member of the Space, or `is_global`                                  | Member (if posting enabled)   | Creator                                            | Creator                |
| `space_cards`         | Member of the Space                                                  | System / API                  | System / API (votes via RPC)                       | —                      |
| `space_join_requests` | Requester or posting creator                                         | Authenticated                 | Both parties                                       | —                      |
| `space_invites`       | Creator or invitee in list                                           | Posting creator               | Both parties                                       | Creator                |
| `activity_cards`      | Owner (`user_id`)                                                    | System / API                  | Owner (status changes)                             | Owner                  |

**Inherited membership RLS:** For Spaces with `inherits_members = true`, the SELECT policy on `space_messages` checks membership of the parent Space (recursive walk up). This is a function:

```sql
create function is_space_member(p_space_id uuid, p_user_id uuid) returns boolean as $$
  with recursive chain as (
    select id, parent_space_id, inherits_members, is_global from spaces where id = p_space_id
    union all
    select s.id, s.parent_space_id, s.inherits_members, s.is_global
    from spaces s join chain c on s.id = c.parent_space_id
    where c.inherits_members = true
  )
  select exists (
    select 1 from chain where is_global = true  -- everyone's a member of global
    union all
    select 1 from chain c join space_members m on m.space_id = c.id where m.user_id = p_user_id
  );
$$ language sql stable security definer;
```

---

### Real-time Architecture

#### Channels

| Channel              | Events                                              | Subscribe when                    |
| -------------------- | --------------------------------------------------- | --------------------------------- |
| `space:{spaceId}`    | INSERT on `space_messages`, UPDATE on `space_cards` | User opens a Space                |
| `activity:{userId}`  | INSERT on `activity_cards`                          | Always (persistent, one per user) |
| `presence:{spaceId}` | Typing indicators, online status                    | User opens a Space                |

#### Subscription lifecycle

- **Lazy subscribe**: subscribe to `space:{id}` when user opens a Space, unsubscribe when they navigate away.
- **Persistent**: `activity:{userId}` stays subscribed for the session. This is the only always-on channel.
- **At most 3 concurrent channels**: 1 Space + 1 activity + 1 presence. Well within Supabase limits.

#### Badge updates (Space list)

`space_members.unread_count` is incremented by a DB trigger on `space_messages` INSERT. The client reads this on Space list load. The `activity:{userId}` channel can also broadcast a lightweight "badge update" event when unread counts change, so the Space list updates without polling.

#### Presence

Same pattern as current: Supabase presence channel per-Space for typing indicators and online status. Scoped to the open Space — no global presence tracking.

---

## 16. Implementation Phases

The rewrite is split into two phases to manage scope.

### Phase 1: Spaces + Posting-Messages (structural rewrite)

The core model change. After Phase 1, the app is a messenger with Spaces, posting-messages, and the existing matching/invite machinery.

| Work             | Description                                                                          |
| ---------------- | ------------------------------------------------------------------------------------ |
| New DB tables    | `spaces`, `space_members`, `space_messages`, `space_postings`, `space_join_requests` |
| Global Space     | Created on migration, all users added as members                                     |
| DM Spaces        | Created for existing connections                                                     |
| Space list UI    | Main screen: Space list with filters, pins, badges, previews                         |
| Activity tab     | Personal cards for matches, invites, connection requests                             |
| Space view       | Conversation timeline with posting-cards inline                                      |
| Compose area     | Message/Posting toggle, inline posting creation                                      |
| State text       | Editable state text per Space, `/summarize` command                                  |
| Posting-messages | Create postings within Spaces, spawn sub-Spaces                                      |
| Matching         | Existing pipeline, scoped by Space (candidate pool = Space members)                  |
| Realtime         | Supabase Realtime per-Space channels                                                 |
| Drop old tables  | Remove old `postings`, `conversations`, `messages`, `group_messages`                 |

### Phase 2: Rich Interactive Cards (coordination intelligence)

Built on top of Phase 1. The card system that replaces back-and-forth.

| Work                         | Description                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------- |
| `space_cards` table          | Card state tracking (active, resolved, superseded)                              |
| Card types                   | Time proposal, RSVP, poll, task claim, location, trade-off                      |
| Card rendering               | Interactive cards in conversation timeline, live updates                        |
| Explicit card actions        | Buttons: vote, change vote, cancel, add options                                 |
| Card resolution              | Auto-confirm on consensus, calendar event creation                              |
| Card invalidation (Phase 2a) | Explicit actions only — buttons on cards                                        |
| Card invalidation (Phase 2b) | Free-text detection — LLM reads messages against active cards, suggests updates |
| Card nudges                  | "Still need to pick a time — 2/4 voted" after N hours                           |
| LLM card generation          | Detect coordination intent from messages, suggest appropriate card type         |

Phase 1 is a complete product — a messenger with coordination postings. Phase 2 adds the intelligence layer that makes coordination dramatically faster.

---

## 17. Migration Path

Clean break — test data only on both platforms.

1. Create new tables (`spaces`, `space_members`, `space_messages`, `space_postings`, `space_join_requests`)
2. Seed the Global Space, add all existing users
3. Create 2-person Spaces for existing connections
4. Drop old coordination tables (`postings`, `join_requests`, `conversations`, `messages`, `group_messages`, `meeting_proposals`, `sequential_invites`, etc.)
5. Keep user-level tables (`profiles`, `connections`, `skill_nodes`, `profile_skills`, `notifications`, `calendars`, `calendar_events`, `templates`)
6. Build new UI on the Space model

No data migration. No expand-contract. Drop and rebuild.

---

## 18. Resolved Questions

### Q1: Global Space naming → **Explore**

User-facing name is "Explore." Continuity with the current Discover tab concept — the Space is primarily for finding things, not conversation.

### Q2: Sub-Space creation → always create, render inline

Every posting-message always spawns a sub-Space technically. The UI difference is in rendering:

- **Inherited membership (same team)**: renders as an **inline collapsible thread** under the posting card. Feels like replying to a message. No navigation required. Works like answering — one meeting, same people, just a thread.
- **Independent membership (outsiders join)**: renders as a **distinct sub-Space** — visually differentiated, appears in the parent Space's sub-Space list, navigable.

The transition is automatic: starts as inline thread, becomes visually distinct when membership diverges from the parent. No user decision needed. See D2 and D3 in the data model.

### Q3: Connection requests → Activity cards

Connection requests are Activity cards. On acceptance, a 2-person Space is created. No message in a Space that doesn't exist yet.

### Q4: Space archiving → 30 days auto-archive

- **Auto-archive** after 30 days of no messages
- Archived Spaces move to collapsed "Archived" section (or filter chip) in Space list
- Still readable, not prominent
- Admin can reactivate by sending a message
- **Deletion is separate and manual** — archiving is non-destructive
- Posting lifecycle (`status`: open → active → closed/filled/expired) is independent of Space archiving

### Q5: Cross-Space posting promotion → new linked posting in Explore

A posting in a small Space can be promoted to Explore as a **new posting-message that links back** to the original sub-Space. Not moving — creating a reference. User-initiated, not automatic. The sub-Space becomes findable/discoverable via Explore.

Example: "We're 2/4 for a film crew — looking for a sound engineer and editor" → posted to Explore, links to the team sub-Space.

### Q6: Recurring posting automation → deferred to Phase 2

The `/recur` concept (scheduled job posts a new posting-message at configured interval) works cleanly in the Space model but isn't needed for launch. Organizers post manually initially.

### Q7: Search across Spaces → Phase 1, Postgres full-text

Phase 1 includes basic search: full-text on `space_messages.content` and `space_postings.text` via Postgres `tsvector`. Within a Space, search filters to that Space. From the Space list, search spans all the user's Spaces.
