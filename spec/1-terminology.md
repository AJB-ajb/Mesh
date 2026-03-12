# Terminology

> Canonical terms, naming decisions, and reasoning — the reference for all user-facing labels.

## Translation Note

We include reasoning behind each term so that when translating to other languages, the translator (human or LLM) can translate the _meaning_ and intent, not just the literal words.

---

## Resolved Decisions

### Posting (not "Project")

Use "posting" throughout.

"Project" implies something structured or long-term. "Posting" is more general and encompasses opportunities, activities, events, tasks, and spontaneous plans. We don't want to specialize too much — many postings might not be full projects.

- **Attribution**: Use "Posted by {name}" (not "Created by").

### Connections (not "Friends" or "Contacts")

Use "connections" for relationships between users.

"Friends" is too casual and implies personal closeness that may not exist between people who met through a posting. "Contacts" is transactional and feels more like an address book. "Connections" is non-hierarchical, neutral, well-understood, and covers the full range of relationship depth.

### Join / Request to join (not "Apply" or "I'm Interested")

The primary CTA depends on a per-posting `auto_accept` setting:

- **"Join"** — when `auto_accept` is true (instant, no approval step). Default for connection-scoped or sequential invite postings.
- **"Request to join"** — when `auto_accept` is false (requires poster approval). Default for open/global postings.

"Apply" implies hierarchy and a formal selection process, which contradicts the collaborative, non-hierarchical ethos. "I'm Interested" is too passive and doesn't commit the user to action. "Join" / "Request to join" is active, inclusive, and sets the right expectation based on whether approval is needed.

#### Cascading label changes

| Old                         | New                          |
| --------------------------- | ---------------------------- |
| Applications                | Join Requests                |
| Submit Application          | Request to join              |
| Application Pending         | Request pending              |
| Application Sent            | Request sent                 |
| Applied to {posting}        | Requested to join {posting}  |
| New application from {name} | New join request from {name} |
| Withdraw                    | Withdraw request             |
| Not Selected                | Keep as-is (good euphemism)  |
| Accepted / Declined         | Keep as-is                   |

### Invite (sequential + parallel)

Use "Invite" in UI and specs. Two sub-modes:

- **Sequential**: invites sent one-by-one in ranked order until someone accepts. The next connection is auto-invited on decline.
- **Parallel**: all selected connections invited at once. First to accept wins.

"Friend Ask" was informal jargon — replaced with "Invite" for clarity. The user chooses the mode via a toggle when creating an invite. Invites now operate within Spaces — you invite connections to join a Space or respond to a posting-message within a Space.

- **DB column**: `mode: "friend_ask"` is being replaced by `visibility: "private"` (expand-contract migration). During the transition, both columns exist; code reads `visibility` and writes both.

### Visibility (not "Mode")

Use "Visibility" as a Space setting that controls discoverability and access.

- **Public**: the Space (or posting within it) appears in Explore for anyone to find and request to join.
- **Private**: the Space is invite-only or link-only. Members invite connections directly.

Previously called `mode: "open" | "friend_ask"`, which was confusing. The new `visibility` setting uses clear, well-understood terminology. The composable access model still applies but within the Space context — Spaces can have public postings while keeping conversation private, or be fully open. Invites are decoupled from visibility — you can invite connections to any Space, regardless of visibility.

### Relevance (not "Semantic" or "Semantic similarity")

Use "Relevance" in match score breakdowns.

"Semantic" and "Semantic similarity" are technical ML terms. "Relevance" is intuitive and covers topic alignment, intent matching, and context similarity.

### Flexible (not "Either" for location mode)

Use "Flexible" as the third location option (alongside Remote and In-person).

"Either" is vague — does it mean "I truly don't care" or "I'm open to both"? "Flexible" communicates openness clearly.

### Bookmarks (Explore saved filter)

Bookmarks are a toggle filter within Explore (the Global Space), not a separate page. Users bookmark postings for later; toggling the saved filter in Explore shows only bookmarked postings. This avoids a standalone page that would go stale.

Previously planned as a separate `/bookmarks` page, but consolidated into Discover (now Explore) during the ux.md redesign (see `spec/ux.md`). In the Spaces model, bookmarks apply to posting-messages within Explore.

### Repost + Extend Deadline (not "Reactivate")

Replace the single "Reactivate" button with two distinct buttons for expired postings:

- **"Repost"** — creates a fresh version of the posting (resets join requests, bumps to top of feed)
- **"Extend Deadline"** — pushes the deadline forward on the existing posting (keeps existing join requests)

These are fundamentally different actions. A single "Reactivate" label doesn't communicate which behavior the user will get.

### Deadline + Activity date (not "Urgency / Expiry")

Split into two distinct fields:

- **"Deadline"** — when the posting closes to new join requests
- **"Activity date"** (optional) — when the activity or project starts

A posting might close in 2 days but be for an event 3 weeks away. These are different concepts.

### Collaboration preferences (not "Collaboration style" or "Work Style Preference")

Standardize on "Collaboration preferences" for both person-level defaults and posting-level overrides.

The spec previously used "Work Style Preference" (person dimensions) and "Collaboration style" (posting fields) for the same concept. One term avoids confusion.

### Categories (simplified)

Use short, clean category names: `Study`, `Hackathon`, `Personal`, `Professional`, `Social`.

The spec previously used slash-separated variants ("Hackathon/Competition", "Personal/Side", "Social/Leisure") but the code already uses the simpler forms.

### Waitlist

When a posting is filled, users can join a waitlist for automatic or manual promotion when a spot opens.

- **"Join waitlist"** — CTA shown on filled auto-accept postings
- **"Request to join waitlist"** — CTA shown on filled manual-review postings
- **"Waitlisted"** — Status badge for users on the waitlist
- **"You are #N on the waitlist"** — Position indicator shown to waitlisted users

### Space (not "Group Chat" or "Channel")

Use "Space" as the fundamental unit. Internally: Coordination Space (CS). A Space is a conversation context with members, state text, and coordination tools. Everything is a Space — DMs, groups, communities, the Global discovery surface.

- 2-person Spaces display as the connection's name (no "Space" label)
- Small Spaces (~2-8) are called "groups" colloquially
- Large Spaces (~100+) may be called "communities"
- The Global Space is called "Explore"

### Explore (not "Discover" or "Global")

The Global Space where everyone is a member. User-facing name: "Explore". This is the discovery surface — posting-only, filterable, matchable. Continuity with the previous Discover concept.

### Posting-message (internal) / Posting (user-facing)

A structured message type within a Space conversation. Carries coordination properties: matching, capacity, lifecycle, deadline. Can spawn a sub-Space. User-facing label remains "Posting" — users don't see "posting-message."

### Activity tab (not "Notifications")

The middle tab in the bottom bar. Shows personal action cards: matches, invites, scheduling proposals, connection requests. Replaces the notifications bell for actionable items. Non-actionable updates (new messages, someone joined) remain as badges on the Space list.

### State text (internal) / Space description (user-facing)

The living markdown document per Space. Updated via `/summarize` command. LLM suggests updates on card resolution. Contains the up-to-date coordination context.

---

### Group / Channel (now Spaces of different sizes)

"Group" and "channel" are no longer distinct entity types — they are Spaces of different sizes with different default settings. The terms may be used colloquially to describe Space behavior:

- **Group**: a small Space (~2-8 members) where people coordinate over time. Messages and posting-messages coexist in the conversation.
- **Community**: a large Space (hackathon, course, community) where members post and discover sub-Spaces. Join via link or QR code. Often in posting-only mode.

These replace the `context_identifier` field, which was a string approximation of what should be a real entity with members, a description, and a lifecycle. See [1-spaces.md](1-spaces.md).

### Context Identifier (deprecated)

The `context_identifier` field (a free-text string like "XHacks 2026" for exact-match filtering) is replaced by the Spaces model. The context becomes a Space — a real entity you can join, browse, and share — rather than a string label. See [1-spaces.md](1-spaces.md) Section 2.

---

## Open Questions

- ~~**Persona selection**~~: Removed. The "developer" / "posting creator" personas contradicted the "no required configuration" principle. Onboarding now goes straight to optional profile setup (paste text, guided prompts, or skip).
- ~~**"Matches" page name**~~: Resolved — this is now the **Activity tab** (middle tab in the bottom bar). Shows personal action cards: matches, invites, scheduling proposals, connection requests.
