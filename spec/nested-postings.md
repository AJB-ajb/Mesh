# Nested Postings & Coordination Contexts

> **Scope**: This document specifies the nested posting model — how postings serve as coordination contexts that can contain sub-postings, replacing several separate concepts (channels, context identifiers, meeting proposals) with a single general mechanism. It amends `spec/matching.md`, `spec/terminology.md`, `spec/ux.md`, and the channel/context-identifier features in `spec/mesh.md` and `spec/roadmap.md`.

---

## 1. Core Concept: Postings as Coordination Contexts

### The problem Mesh solves

Every activity involves **multi-dimensional negotiations** that messaging apps force into back-and-forth rounds:

- **Who** — finding compatible people (skills, interests, fit)
- **When** — finding a mutually good time
- **Where** — agreeing on a place
- **What exactly** — clarifying roles, expectations, details
- **How many** — team size, who's in/out

Mesh substitutes each negotiation with a mechanism: matching handles **who**, calendar overlap handles **when**, location matching handles **where**, deep matching + acceptance prompts handle **what**, team size + waitlist handle **how many**.

### A posting is a context

A posting establishes a coordination context: a set of negotiation dimensions, some resolved, some open. The system infers which dimensions are open and adapts the UI accordingly — matching weights, acceptance flow, notifications, and lifecycle all respond to the negotiation state.

### Contexts nest

A posting can be a child of another posting. The child inherits the parent's resolved dimensions (participants, topic, location) and opens new negotiations on whatever is specific to it.

```
Parent posting: "XHacks team — building an accessibility checker"
  resolved: who (the 3 team members), what (the project), where (TUM campus)

  Child posting: "Planning call this week — 30 min?"
    inherits: who, what, where
    negotiates: when (specific time from calendar overlap)
```

The child posting doesn't re-negotiate what the parent already resolved. The system carries that context forward automatically.

### What this replaces

The nested posting model unifies several previously separate concepts:

| Previous concept | Becomes |
|---|---|
| `context_identifier` (string field) | Parent posting (real entity with members, description, lifecycle) |
| Channels (v1.0 roadmap) | Parent postings with open membership and many children |
| Meeting proposals | Conceptually a child posting (see [Section 6](#6-meeting-proposals)) |
| Recurring posting instances | Children of a standing parent posting |
| "Defaults from other postings" (matching.md) | Context inheritance via parent |

One relationship (`parent_posting_id`) replaces all of these.

---

## 2. Data Model

### Schema change

```sql
postings:
  parent_posting_id: uuid  -- nullable, FK -> postings.id
```

- `null` = top-level posting (current behavior)
- Set = child posting that inherits context from parent

### Nesting depth

One level is sufficient for nearly all use cases:

- **Flat**: spontaneous activities, standalone searches (no parent)
- **Parent -> children**: groups, projects, recurring activities, channels

A channel posting can have team postings as children, and those team postings can have meeting sub-postings as children. This is technically two levels from the channel, but each posting only looks one level up to its direct parent. The LLM can walk up the chain for richer context when needed.

No artificial depth limit is enforced, but the UX is designed for one level of nesting being the common case.

### Context inheritance

What a child posting gets from its parent:

| Dimension | Inheritance behavior |
|---|---|
| **Participants** | Default audience. Child is scoped to parent's accepted members. Can be narrowed ("who from the team...") but not expanded beyond parent. |
| **Topic/what** | Carried as LLM context. The LLM reads parent text when processing child — understands "a planning call for the XHacks project," not just "a planning call." |
| **Location** | Default. Child can override ("let's meet at the library instead"). |
| **When** | Constraining. If parent has a time scope (event dates, semester), child negotiates within that window. |
| **Skills/roles** | Context. The LLM knows what skills the team has for task assignment. |
| **Visibility** | Inherited. Private parent -> private children. Channel parent -> channel-scoped children. |

Most inheritance is **implicit** — the LLM reads the parent posting text and metadata and uses it as context. The user doesn't configure inheritance. They write "planning call this week?" within their hackathon team, and the system knows what that means.

### Migration: context_identifier

Existing `context_identifier` values become parent postings. Postings sharing the same identifier become children of the new parent. The `context_identifier` column is then dropped. This is an expand-contract migration:

1. Create parent postings from distinct `context_identifier` values
2. Set `parent_posting_id` on child postings
3. Verify data integrity
4. Drop `context_identifier` column

---

## 3. Negotiation State

Each posting has an implicit state for each negotiation dimension:

```
who:    resolved | matching | invite-pending
when:   resolved | flexible | needs-scheduling
where:  resolved | flexible | needs-agreement
what:   resolved | partially-open | open
size:   resolved | flexible
```

This state is **inferred from the posting text + metadata by the LLM**, not configured by the user. It drives:

- **Matching weights**: if "when" is open, weight availability higher. If "who" is the main question, weight skills/interests higher.
- **Acceptance flow**: generate UI for unresolved dimensions only.
- **Post-formation flow**: if "when" still needs scheduling after team forms, surface scheduling tools prominently.
- **Notifications**: if all dimensions are resolved, acceptance is one-tap. If several are open, the acceptance card needs more interaction.

For child postings, the parent's resolved dimensions carry over — the child's negotiation state starts from a more resolved baseline.

### Optional: explicit tracking

The negotiation state could be stored as a derived field:

```sql
postings:
  negotiation_state: jsonb  -- LLM-extracted, e.g. { "who": "resolved", "when": "open", ... }
```

This enables the system to adapt without re-inferring the state on every interaction. Like other extracted metadata, it's a read-only derivation from the text, correctable by the user.

---

## 4. Composition UX

### Core principle: composing a posting feels like composing a message

The same editor is used for every posting — top-level, child, sub-posting within a group. The difference is the **context you're composing from**, which determines scope and inheritance. The user just writes what they'd write in a message.

### Composition entry points

| Where you compose from | What happens |
|---|---|
| **Discover / global compose** | Top-level posting. Public. Matching runs globally. Full editor. |
| **Inside a small group** | Child posting scoped to group members. Lightweight feel — like sending a message to the group. |
| **From a connection's profile** | Private posting with that person pre-filled as invitee. |
| **Inside a channel** | Child posting discoverable within channel. Matching runs on channel members. |

The text editor is always the same. Slash commands work everywhere. The context is implicit from where composition started.

### Effort scales with context

The more context is established, the less the user writes:

- **Top-level public posting**: describe everything (what, who you want, when, where). Most effort.
- **Child posting in a channel**: context scopes the domain. Describe your specific need.
- **Sub-posting in a small group**: "meet Thursday?" — everything else inherited. Near-zero effort.
- **RSVP to a recurring instance**: one tap. Yes/no.

This is the payoff of context inheritance — the system already knows everything except what you're asking right now.

### Floating action button

The FAB remains as a shortcut for "compose a top-level posting from anywhere." But it's no longer the primary entry point. Most postings start from a context: inside a group, from a connection, within a channel. Context-specific compose areas are the natural composition points.

---

## 5. UX Structure

### Posts page: the hub for ongoing coordination

The Posts page (`/posts`) shows all user-related postings with filter chips (All, Created, Joined, Applied, Completed). The Joined filter shows active groups. With nesting, each group shows its coordination activity:

```
Active
|
|-- XHacks Team                          2 new
|   |-- Chat
|   |-- Coordination
|   |   |-- "Planning call Wed?" -- 3/4 confirmed
|   |   |-- "Frontend or backend?" -- Kai: frontend
|   |   +-- [+ New]
|   +-- Members (3)
|
|-- Spanish Practice                     this week
|   |-- Chat
|   |-- This week's session -- Tue 18:30 confirmed
|   +-- Members (4)
|
+-- Coffee with Lena                     tomorrow
    +-- Tomorrow 15:00, Cafe Fruhling confirmed
```

Flat postings (like the coffee) have no children — they appear as a single item with confirmed state. Groups show their coordination activity in a **Coordination** section alongside Chat. This view is accessed via the Joined filter in Posts.

### Discover adapts to context

Top-level Discover shows public parent postings and flat postings. Inside a channel, Discover is scoped to that channel's children:

```
Discover (global):
  "XHacks 2026 -- find teammates"              [Join]
  "Tennis Saturday, intermediate"               [Request to join]
  "Weekly Spanish practice, beginners"          [Request to join]

Discover (inside XHacks, after joining):
  "Accessibility checker -- need designer"      [Request to join]
  "ML project -- looking for PyTorch exp"       [Request to join]
```

Entering a context scopes Discover to that context's children. This replaces `context_identifier` filtering with something more natural: you're **inside** the context, not filtering by a string.

### Sidebar navigation

```
Sidebar:
  Discover        -- top-level, or context-scoped when inside a channel
  Posts           -- merged view: created, joined, applied, completed (filter chips)
  Connections
```

Posts replaces the old separate My Postings, Active, and Bookmarks pages (see `spec/ux.md`). Active postings (groups) are accessed via `Posts > Joined` filter.

When the user taps into a group in Posts, they enter the group view with:
- **Chat** — existing group messaging
- **Coordination** — child postings (meetings, task assignments, RSVPs)
- **Members** — who's in the group
- **Info** — the parent posting text, settings

### Sub-postings feel like group activity, not new postings

Child postings within a group are more like updates in a conversation than separate items in a feed. They're composed and displayed inline within the group view, not as standalone pages in Discover.

For channels (large groups), child postings are more substantive and get their own cards within the channel's scoped Discover view. But for small groups, sub-postings are lightweight — a coordination feed within the group.

---

## 6. Meeting Proposals

Meeting proposals (`meeting_proposals` table) are **conceptually child postings** — they negotiate the "when" dimension within a group context. For now they remain as a separate lightweight table because:

- They're a very common, very specific interaction (propose time, RSVP)
- The full posting machinery (text editor, LLM extraction, matching) is heavier than needed for "meet Thursday?"
- The existing implementation works

The mental model is: a meeting proposal is a child posting that only negotiates "when." If the nested posting model matures and proves its weight, meeting proposals can be unified into it — a child posting with a recognized pattern where the LLM generates meeting-specific UI (time slot picker, RSVP buttons).

Until then, meeting proposals live in their own table but are understood as part of the same conceptual hierarchy. The Coordination section in the group view can display both meeting proposals and other child postings in a unified timeline.

---

## 7. Small Groups vs. Channels

The same parent-child model, but behavior differs by participant count:

| Behavior | Small group (2-8) | Channel (20+) |
|---|---|---|
| **Child postings** | Broadcast to all members | Discoverable within channel, matching filters |
| **Notifications** | All members see new sub-postings | Only matched/interested members notified |
| **Composition** | Quick, message-like, at the bottom of group view | Fuller composition (like top-level, but context-scoped) |
| **In Discover?** | No — private coordination | The channel is discoverable; children are discoverable within it |
| **Join mechanism** | Invite or matching into the parent posting | Join channel via link/QR, then browse/match within |

This isn't a type flag. It emerges from participant count. A group with 4 people naturally broadcasts. A channel with 200 needs matching to avoid noise.

The threshold is soft — around 10-15 members, behavior shifts from "everyone sees everything" to "matching filters what you see." The transition can be gradual.

---

## 8. Matching in the Nested Model

### Fast matching = negative elimination

Fast matching (Stage 1) filters clear negatives: wrong location, zero time overlap, wrong skill domain, not in the relevant context. It's a cost gate for the deep match LLM.

As context narrows, fast filtering does less work because **the context already filtered**:

| Check | Global (top-level) | Channel (child) | Small group (sub-posting) |
|---|---|---|---|
| Context membership | n/a | already satisfied | already satisfied |
| Category | yes | mostly redundant | no |
| Location proximity | yes | maybe (channel may be location-scoped) | inherited |
| Time overlap | yes | yes | availability check only |
| Skill overlap | yes | yes (more specific) | no |
| Embedding similarity | yes | lighter | no |

### Deep matching = the real intelligence

Deep matching (Stage 2) is where negotiation-substitution happens. The LLM evaluates nuanced compatibility — what a human would assess in back-and-forth messages.

With nesting, the deep match gets **richer context**:

```
Deep match input (current):
  - Posting text
  - Candidate profile text
  - Fast filter overlap summary

Deep match input (with nesting):
  - Posting text
  - Parent posting text (project context, group purpose)
  - Candidate profile text
  - Candidate's activity within this context (if any)
  - Fast filter overlap summary
```

### Candidate pool by context

```
candidate_pool = parent.participants ?? all_users
```

- **Top-level posting**: match against all users (current behavior)
- **Channel child posting**: match against channel members
- **Small group sub-posting**: no matching — broadcast to members, availability check only

The matching algorithm is the same. The pool narrows by context, and the LLM receives richer context from the parent chain.

### Proactive matching within channels

When someone joins a channel, the system can match them against existing child postings: "Welcome to XHacks! Here are 3 teams looking for someone with your skills." Same matching engine, different trigger — matching runs on join, not just on posting creation.

### Within-group recommendations

For sub-postings like "who can handle the frontend demo?" within a small group — the LLM can recommend team members best suited, based on their profiles and the parent context. Same deep-match machinery, different framing: not "who should join?" but "who should do this?"

---

## 9. Notifications

Three tiers to manage noise from nested activity:

### Tier 1: Needs your response (high priority)

- Invited to a posting
- Matched with a high-score posting
- Sub-posting in your group needs your response (RSVP, time confirmation, task assignment)
- Someone accepted/declined your posting

Delivered as: bell notification + optional push.

### Tier 2: Group activity (medium priority)

- New sub-posting in a group you're in
- Someone joined your group
- Chat activity

Delivered as: **unread badge on the group** in Posts (Joined filter) — like unread messages in a chat app. Not individual bell notifications. The user sees them when they open the group.

### Tier 3: Digest-worthy (low priority)

- New child postings in a channel you joined
- Weekly summary of group activity

Delivered as: daily or weekly digest, not real-time.

### Recurring sub-posting notifications

For recurring activities (e.g., "Weekly Spanish practice"), the weekly instance triggers a Tier 1 notification for the RSVP: "This week's Spanish practice — Tue 18:30. Coming? [Yes] [No]"

If a member consistently attends, the system could learn this and downgrade to Tier 2, only escalating when something changes (different time, new member, location change).

---

## 10. Recurring Postings

A recurring activity is a **parent posting that stays open/active**, with child postings created for each instance.

```
Parent: "Weekly Spanish practice -- Tuesdays ~18:00, Cafe Fruhling"
  resolved: what, where, roughly when (pattern)
  participants: the regular group

  Child (auto or one-tap): "This week's session"
    inherits: what, where, who (current group members)
    negotiates: exact time (18:00 or 18:30 from calendar overlap)
    also: who's coming this week? (RSVP)
```

### Instance creation

- **Manual** (current: Repost): poster taps "Post again" or uses `/repost`. Creates a new child with dates reset and LLM-suggested new times based on the pattern.
- **Automatic** (future: `/recur weekly tue`): system auto-creates child instances on schedule. Each instance inherits context, sends RSVPs to the group.

Manual repost covers most use cases with minimal infrastructure. Auto-recurrence is a natural extension (roadmap v1.1).

### New members

New people can discover and join the parent posting at any time. When they join, they're added to the participant list and receive notifications for future instances. They don't retroactively appear in past instances.

---

## 11. Use Case Walkthroughs

### Spontaneous tennis (flat, no nesting)

```
"Tennis this Saturday afternoon, intermediate, near Englischer Garten"
```

No parent. Matching runs globally. Acceptance flow: time slot picker from calendar overlap -> confirm -> calendar event -> done. Lifecycle: hours to days.

### Hackathon team (one level of nesting)

```
Parent: "XHacks team -- accessibility checker. Need designer + backend dev."
  Team forms via matching. Three people join.

  Child: "Pre-hackathon planning -- 30 min call this week?"
    Scoped to team. LLM generates time slots from 3-way calendar overlap.

  Child: "Who handles Figma mockups before Saturday?"
    Scoped to team. LLM can recommend based on team members' skills.
```

### Recurring practice (parent with recurring children)

```
Parent: "Weekly Spanish practice -- conversational, beginner-friendly, Tuesdays"
  Stays open. New members can join anytime.

  Child (weekly): "This Tuesday's session"
    RSVP sent to group. Time confirmed from calendar overlap.
    New member who joined this week gets their first RSVP.
```

### Course project (long-lived group)

```
Parent: "Data Structures course project -- need 2 partners, deadline June 15"
  Team forms. Over the semester:

  Child: "Weekly sync -- when works?"
    Negotiates a recurring time slot from calendar overlap.

  Child: "Working session for Assignment 3 -- this weekend?"
    Negotiates: when (specific), where (library? remote?).
```

### Hackathon channel (large group, scoped discovery)

```
Parent: "XHacks 2026" (channel, shared via QR code at venue)
  200 participants join.

  Child: "Building an accessibility checker -- need designer"
    Discoverable within channel. Matching runs on channel members.

  Child: "ML project -- looking for PyTorch experience"
    Same: scoped discovery + matching.
```

The channel is a parent posting with open membership. Child postings within it go through matching, scoped to channel members.

### Coffee with a connection (composed from connections page)

User taps "Do something together" on Lena's profile. Editor opens with Lena pre-filled.

```
"Coffee this week?"
```

Post. Calendar overlap with Lena -> time slot suggestions. Private, flat posting. No nesting needed.

---

## 12. User-Facing Language

Users never see "sub-posting," "parent context," or "nesting." The concepts use familiar language:

| Internal concept | User-facing language |
|---|---|
| Parent posting (small group) | **Group** — "your XHacks team" |
| Parent posting (large, open) | **Channel** — "the XHacks 2026 channel" |
| Child posting (in group) | Posting or update — "post to your group" |
| Child posting (in channel) | Posting — same as top-level, but scoped |
| Recurring parent | The activity name — "your weekly Spanish practice" |
| Recurring child | **This week's session** or similar instance label |
| Context inheritance | Invisible — "the app already knows your group" |

One-sentence explanation for users: **"Post in your group to coordinate with your team. The app already knows who's involved and what you're working on."**

---

## 13. Implementation Phases

| Phase | Scope | Depends on |
|---|---|---|
| 1 | `parent_posting_id` column. Child posting creation API. Basic context inheritance (participants scoped to parent). | -- |
| 2 | Group view in Posts page (Joined filter): coordination section showing child postings alongside chat. Compose-in-context UX. | Phase 1 |
| 3 | `context_identifier` migration: convert to parent postings, drop column. | Phase 1 |
| 4 | Channel behavior: scoped Discover within a parent posting. Matching on channel members. Join via link/QR. | Phase 1-2 |
| 5 | Recurring instances: `/repost` creates child linked to parent. Future: `/recur` for auto-creation. | Phase 1-2 |
| 6 | Meeting proposal unification (optional): migrate `meeting_proposals` to child postings with meeting-specific UI. | Phase 1-2, mature model |

Phase 1 is the foundation. Everything else builds on a single FK column.

---

## 14. Integration Points

- **`spec/matching.md`**: Candidate pool narrows by context (`parent.participants ?? all_users`). Fast filter gets lighter as context narrows. Deep match receives parent chain as additional context. See [Section 8](#8-matching-in-the-nested-model).
- **`spec/scheduling-intelligence.md`**: Slot generation works the same but inherits context. A child posting "meet Thursday?" within a group auto-scopes to the group's members for calendar overlap. The scheduling intelligence layer receives parent context for smarter suggestions.
- **`spec/availability-calendar.md`**: Team scheduling (Part C) naturally maps to child postings — the "propose a meeting" flow is a child posting negotiating "when."
- **`.prompts/todo/text_first_rewrite.md`**: Composition UX aligns with text-first philosophy — same editor everywhere, context determines scope. Slash commands work in child postings with inherited context.
- **`spec/ux.md`**: Posts page (Joined filter) gains group view with coordination section. Discover gains context-scoped mode.
- **`spec/terminology.md`**: New terms: "group" (small parent posting), "channel" (large parent posting). `context_identifier` deprecated.
- **`spec/roadmap.md`**: Channels (v1.0) and recurring postings (v1.1) are subsumed by this model and can be reprioritized.

---

## Open Questions

- **Notification learning**: Should the system learn attendance patterns for recurring groups and auto-downgrade notification priority? How quickly?
- **Group size threshold**: At what member count does behavior shift from broadcast to matching-filtered? Soft threshold around 10-15 suggested but needs testing.
- **Depth limit**: No hard limit enforced but UX designed for one level. Should we add a soft limit (warn at depth 3+) or let it be?
- **Meeting proposal unification timeline**: When does it make sense to migrate `meeting_proposals` into the child posting model? Depends on how natural the child posting creation UX feels for quick time proposals.
- **Group lifecycle**: When does a group "end"? For project groups: when the project is done (manual close or deadline). For channels: when the event/course ends. For recurring groups: stays open indefinitely? Needs lifecycle rules.
- **Cross-context visibility**: Can a child posting in a channel be promoted to global Discover? (e.g., a team that can't find a designer within the hackathon channel wants to search globally.) Edge case but worth considering.
