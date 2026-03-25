# Terminology

> Canonical terms for user-facing labels. Each entry states the term, its meaning, and a brief rationale. When translating, translate the _meaning_, not just the literal words.

---

## Terms

### Posting

General term for any coordination proposal — encompasses projects, activities, events, tasks, spontaneous plans. Attribution: "Posted by {name}". Internally, a posting within a Space conversation is a **posting-message** (users see "Posting").

### Connection

Relationship between users. Non-hierarchical, neutral, covers the full range from "met through a posting" to close friends.

### Join / Request to join

Primary CTA, determined by per-posting `auto_accept` setting:

- **"Join"** — `auto_accept = true` (instant). Default for connection-scoped or sequential invite postings.
- **"Request to join"** — `auto_accept = false` (requires approval). Default for open/global postings.

Active and inclusive — avoids "Apply" (hierarchical) or "I'm Interested" (passive, non-committal).

Related labels: "Join Requests", "Request pending", "Request sent", "Withdraw request", "Not Selected" (euphemism, keep as-is).

### Invite

Sending a coordination proposal to specific connections. Two sub-modes:

- **Sequential**: one-by-one in ranked order; auto-advances on decline/timeout.
- **Parallel**: all at once; first to accept wins.

### Visibility

Space setting controlling discoverability:

- **Public**: appears in Explore.
- **Private**: invite-only or link-only.

Composable access model ([1-posting-access.md](1-posting-access.md)) provides finer control via independent paths (Context, Invite, Link, Discover).

### Relevance

Match score dimension label. Covers topic alignment, intent matching, and context similarity. Avoids technical ML jargon ("semantic similarity").

### Flexible

Third location option (alongside Remote and In-person). Communicates openness without the ambiguity of "Either."

### Bookmarks

Toggle filter within Explore (the Global Space). Users bookmark postings for later; the filter shows only bookmarked items. Not a separate page.

### Repost / Extend Deadline

Two distinct actions for expired postings:

- **Repost**: fresh version (resets requests, bumps to top).
- **Extend Deadline**: pushes deadline forward (keeps existing requests).

### Deadline / Activity date

Two distinct time fields:

- **Deadline**: when the posting closes to new requests.
- **Activity date** (optional): when the activity starts.

### Collaboration preferences

Person-level defaults and posting-level overrides for collaboration style. Includes intensity (0–10) and preferred activities (pair programming, async review, etc.).

### Categories

Short labels: `Study`, `Hackathon`, `Personal`, `Professional`, `Social`.

### Waitlist

When a posting is filled, additional users can waitlist for auto/manual promotion.
Labels: "Join waitlist" / "Request to join waitlist", "Waitlisted", "You are #N on the waitlist."

### Space

The fundamental unit. A conversation context with members, state text, and coordination tools. Everything is a Space — DMs, groups, communities, Explore. See [1-spaces.md](1-spaces.md).

- 2-person Spaces display as the connection's name
- Small Spaces (~2–8): "groups" colloquially
- Large Spaces (~100+): "communities" colloquially

### Explore

The Global Space. User-facing name for the discovery surface — posting-only, filterable, matchable. Everyone is a virtual member.

### Activity tab

Middle tab in the bottom bar. Personal action cards: matches, invites, scheduling proposals, connection requests. Non-actionable updates (new messages, joins) remain as badges on Spaces.

### State text

Internal term for the living markdown document per Space. User-facing: "Space description." Updated via `/summarize` or on card resolution.
