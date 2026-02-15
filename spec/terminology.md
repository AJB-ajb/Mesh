# Terminology

Canonical reference for all user-facing terminology in MeshIt. When implementing UI labels, spec updates, or translations, always refer to this document.

See also: [mesh.md](mesh.md) (product overview), [ux.md](ux.md) (UX spec), [matching.md](matching.md) (matching algorithm).

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

"Friends" is too casual and implies personal closeness that may not exist between people who met through a posting. "Contacts" is transactional and feels like an address book. "Connections" is non-hierarchical, neutral, well-understood, and covers the full range of relationship depth.

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

### Sequential Invite (not "Friend Ask" or "Cascading Invites")

Use "Sequential Invite" in UI and specs.

"Friend Ask" is informal jargon — a user seeing this badge won't know what it means. "Cascading Invites" is more descriptive but still technical. "Sequential Invite" clearly communicates the mechanism: invites sent one-by-one in a ranked order until enough people accept. Also works for groups (not just pairs).

- **DB column**: `mode: "friend_ask"` stays for now (internal, no user impact).

### Relevance (not "Semantic" or "Semantic similarity")

Use "Relevance" in match score breakdowns.

"Semantic" and "Semantic similarity" are technical ML terms. "Relevance" is intuitive and covers topic alignment, intent matching, and context similarity.

### Flexible (not "Either" for location mode)

Use "Flexible" as the third location option (alongside Remote and In-person).

"Either" is vague — does it mean "I truly don't care" or "I'm open to both"? "Flexible" communicates openness clearly.

### Bookmarks (separate page)

Move saved/bookmarked postings from the Matches page to a dedicated `/bookmarks` page with its own sidebar nav item.

The Matches page was overloaded with three unrelated sections (AI Matches, Interests Received, My Interests). "Bookmarks" is a well-understood pattern (save for later) that doesn't imply commitment to the poster.

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

---

## Open Questions

- **Persona selection** ("developer" / "posting creator"): Unclear what these mean. Contradicts "no required configuration" principle if required during onboarding. Needs clarification or removal.
- **"Matches" page name**: With Bookmarks and Join Requests moved elsewhere, this page is now just AI recommendations. Consider renaming to "Recommended" or "For You."
