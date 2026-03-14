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

- Auto-archive after 30 days of no messages
- Archived Spaces move to a collapsed "Archived" section in the Space list
- Still readable, not prominent
- Admin can reactivate by sending a message
- Posting lifecycle (status) is independent of Space archiving

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

Phase 1 implementation status as of 2026-03-14. Items marked Done have DB schema, API routes, hooks, and UI components in place.

### Done

| Feature                                          | Notes                                                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spaces` table and core data model               | All 7 tables: spaces, space_members, space_messages, space_postings, space_join_requests, space_invites, activity_cards. RLS, triggers, FTS indexes. |
| Space list (messenger-like main screen)          | Filters (All/DMs/Groups/Public/Pinned), search, pins, unread badges, last-message previews, realtime updates.                                        |
| Three-tab navigation (Spaces, Activity, Profile) | Bottom bar (mobile) + sidebar (desktop).                                                                                                             |
| Global Space (Explore)                           | `is_global` flag, RLS virtual membership for all authenticated users, posting-only.                                                                  |
| Unified conversation timeline                    | Messages + posting-cards + system messages rendered in single timeline with auto-scroll.                                                             |
| Posting-messages (postings within Spaces)        | Create posting within Space, auto sub-Space generation, posting browser for large Spaces.                                                            |
| Message/Posting compose toggle                   | Compose area with M/P pill toggle and inline posting fields.                                                                                         |
| State text (living markdown document)            | Collapsible banner below header, editable by admins. `/summarize` not yet wired.                                                                     |
| Activity tab with personal cards                 | Activity page with typed cards (match, invite, join_request, scheduling, rsvp, connection_request), realtime subscription.                           |
| `activity_cards` table (replaces `matches`)      | Full schema with types, status, from_user_id, posting_id, score, data jsonb.                                                                         |
| Per-member read tracking (`last_read_at`)        | DB trigger increments `unread_count` on message INSERT. Auto mark-as-read on message fetch.                                                          |
| Join requests                                    | Submit, accept, reject, waitlist. Auto-accept when posting has `auto_accept`. Activity card created for posting creator.                             |
| Invite batches                                   | Sequential/parallel modes, ordered list, pending/declined tracking. Activity cards for invitees.                                                     |
| Realtime messaging                               | Supabase Realtime per-Space channels. Optimistic updates with fallback.                                                                              |
| Presence/typing indicators                       | Hook implemented (`use-space-presence`). Not yet wired to compose area UI.                                                                           |

### Remaining Phase 1

| Feature                                          | Status          | Notes                                                                                                                                                                  |
| ------------------------------------------------ | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activity card side-effects                       | Not implemented | `actOnCard` only flips card status. Accepting a join_request card doesn't accept the actual join request. Invite cards can't trigger join. Match cards don't navigate. |
| Invite response flow                             | Not implemented | Invitees receive invite activity cards but no API to accept/decline. No endpoint for invite responses.                                                                 |
| Global Space + DM seeding                        | Not implemented | No migration creates the Global Space row or DM Spaces for existing connections.                                                                                       |
| Old table cleanup                                | Not implemented | Old `postings`, `conversations`, `messages`, `group_messages` tables still exist.                                                                                      |
| Posting-only mode enforcement                    | Not implemented | `settings.posting_only` exists in DB but compose area doesn't check it.                                                                                                |
| Member management UI                             | Not implemented | `space-info-sheet` shows members but no controls to remove members, change roles, or invite.                                                                           |
| Posting status transitions                       | Not implemented | No UI to close/fill postings. No auto-expiration on deadline.                                                                                                          |
| Posting edit/delete UI                           | Not implemented | PATCH/DELETE API exists but no frontend controls.                                                                                                                      |
| Realtime for postings                            | Not implemented | `use-space-postings` has no realtime subscription; new postings require manual refresh.                                                                                |
| Typing indicators wiring                         | Not implemented | Presence hook exists but not connected to compose area.                                                                                                                |
| Sub-Spaces and thread rendering                  | Not implemented | Sub-Spaces created on posting but no inline thread UX or navigation to them.                                                                                           |
| `visible_from` (pre-invite conversation hiding)  | Not implemented | Column exists but messages not filtered by it.                                                                                                                         |
| Matching integration with Spaces                 | Not implemented | `matching_enabled` toggle exists but pipeline not wired to Spaces model.                                                                                               |
| DM Spaces                                        | Not implemented | Schema supports 2-person Spaces but no creation flow on connection accept.                                                                                             |
| Inherited vs. independent membership transitions | Not implemented | `inherits_members` flag exists. No auto-transition when outsiders join.                                                                                                |
| Space archiving (30-day auto-archive)            | Deferred        | No archiving mechanism. Low priority for Phase 1.                                                                                                                      |
| Cross-Space posting promotion                    | Deferred        | Linking, not moving. Low priority for Phase 1.                                                                                                                         |

### Phase 2 (not started)

| Feature                         | Notes                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------ |
| Rich interactive cards          | Time proposals, RSVPs, polls, task claims, location, trade-off. `space_cards` table. |
| Card invalidation from messages | Phase 2b: LLM detection from messages.                                               |
| LLM card generation             | Detect coordination intent, suggest card type.                                       |
