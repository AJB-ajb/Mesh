# Posting Access & Composition

> Composable access model for postings — how discovery, invites, links, and context compose to determine audience. Replaces the binary visibility enum.

---

## 1. The Problem With Enums

The current visibility model (`public | private`) is too rigid:

- It conflates "who can discover this" with "who can access this."
- It can't express "visible to my connections but not strangers" or "visible to group members plus one outside mentor."
- It forces users to think in abstract categories rather than answering the natural question: "who is this for?"

A richer enum (`public | connections | context | private`) would be more expressive but still inflexible — every new scope requires a new enum value, and combinations (group + some outsiders) remain impossible.

---

## 2. Composable Access Model

Instead of a single visibility field, a posting's audience is composed from independent building blocks:

### The four access paths

| Path | What it does | How the user activates it |
|---|---|---|
| **Context** | The posting is discoverable within its parent group/channel | Compose from inside a group, or select a group in the context bar |
| **Invite** | Specific people get notified and can access the posting | Add people in the invite field, or `/invite @name` |
| **Link** | Anyone with the URL can view the posting | Create a link via the context bar or `/link` |
| **Discover** | The posting appears in the platform-wide Discover feed | Toggle in the context bar (default for top-level postings without invitees) |

### How they compose

The effective audience is the union of all active paths:

```
audience = context_members (if context set)
         + invitees (always)
         + link_holders (if link created)
         + all_users (if in Discover)
```

Each path is independent. Activating one doesn't deactivate another. A posting can be in a group context AND have outside invitees AND have a shareable link AND appear in global Discover — or any subset.

### Acceptance mode is orthogonal

How someone **joins** is controlled by the acceptance mode, which applies uniformly to everyone in the audience regardless of how they found the posting:

- **auto_accept = true**: anyone in the audience can join immediately ("Join")
- **auto_accept = false**: anyone in the audience can request to join; poster reviews ("Request to join")

Exception: explicit invitees always get a direct "Accept invite" / "Decline" flow, bypassing the request step.

### What the data model stores

```
postings:
  parent_posting_id   uuid     -- context (nullable, FK -> postings.id)
  in_discover         boolean  -- appears in platform-wide Discover feed
  link_token          text     -- shareable link token (nullable; null = no link)
  auto_accept         boolean  -- join vs request-to-join

posting_invites:
  posting_id          uuid
  user_id             uuid
  status              text     -- pending | accepted | declined
```

- `parent_posting_id` set -> discoverable within parent's members
- `in_discover = true` -> appears in global Discover
- `link_token` not null -> accessible via `/p/{link_token}`
- Invitees always have access regardless of other settings

### Replacing `visibility`

The old `visibility: public | private` maps to:

| Old | New |
|---|---|
| `visibility = 'public'` | `in_discover = true` |
| `visibility = 'private'` | `in_discover = false`, has invitees |

The `visibility` column can be migrated via expand-contract: write both during transition, then drop `visibility`.

---

## 3. Defaults By Composition Context

The system sets sensible defaults based on where the user starts composing:

| Where you compose from | Context | In Discover | Invitees | Acceptance |
|---|---|---|---|---|
| Global FAB / Discover | none | yes | none | manual |
| A connection's profile | none | no | that person | auto |
| Inside a small group | that group | no | none (broadcast) | auto |
| Inside a channel | that channel | no (within channel) | none | manual |
| Global FAB, then select a group | that group | no | none | auto |

Users can always override any default. The defaults just minimize decisions for common cases.

### Context selection from global compose

The compose context bar includes a group search. Users don't need to navigate into a group to post to it — they can search and select a group from the global compose screen. When a group is selected, defaults update accordingly.

---

## 4. Composition UX: The Context Bar

The posting form reduces to three elements:

1. **Text editor** — the posting content (primary)
2. **Context bar** — shows and controls who can access the posting
3. **Settings row** — collapsed, for behavioral settings (team size, expire, acceptance mode, N-sequential)

### Context bar layout

The context bar sits below the text editor and shows a live summary of the posting's audience:

```
+--------------------------------------------------+
| [Text editor with speech input]                   |
|                                                   |
+--------------------------------------------------+
| Context: [None]  [Search groups...]               |
| Invite:  [+ Add people]                           |
| Link:    [Create link]                            |
|                                                   |
| -> Visible to: Everyone (Discover)                |
|                                                   |
| Settings >  (size, expire, accept, N-sequential)  |
+--------------------------------------------------+
|                    [Post]                          |
+--------------------------------------------------+
```

The summary line ("Visible to: ...") updates live as the user changes context, invitees, link, or discover settings. Examples:

| State | Summary |
|---|---|
| No context, no invitees, in_discover=true | "Everyone (Discover)" |
| No context, invitees=[Lena], in_discover=false | "Only Lena" |
| No context, invitees=[Lena, Kai], in_discover=false | "Only Lena and Kai" |
| No context, invitees=[Lena], in_discover=true | "Everyone (Discover) + Lena invited" |
| Context=XHacks Team, in_discover=false | "XHacks Team (4 members)" |
| Context=XHacks Team, invitees=[Prof. Weber] | "XHacks Team (4 members) + Prof. Weber" |
| No context, link created, in_discover=false | "Anyone with the link" |
| No context, invitees=[Lena], link created | "Lena + anyone with the link" |

### Settings row

Collapsed by default. Contains:

| Setting | Command | Default |
|---|---|---|
| Team size (min/max) | `/size` | 1–5 |
| Expiry | `/expire` | 3 days |
| Acceptance mode | `/autoaccept` | depends on context (see Section 3) |
| N-sequential count | `/sequential` | 1 |

All settings can also be set via slash commands. The commands are "stateful" — they modify posting state without inserting text into the editor.

---

## 5. Links

### Invite links vs discovery links

Both use the same `link_token` mechanism. The distinction is social, not technical:

- **Invite link**: shared with specific people ("here's the link to our dinner planning"). The sender knows who they're sharing with.
- **Discovery link**: shared broadly ("scan this QR code to join the hackathon channel"). Anyone who encounters it can access the posting.

Technically identical — a URL containing the `link_token`. The posting's acceptance mode controls what happens when someone arrives via the link:

- `auto_accept = true`: link holder joins immediately
- `auto_accept = false`: link holder can view and request to join

### Link creation

- Via context bar: "Create link" button
- Via command: `/link`
- The link can be revoked (generates a new token, old link stops working)
- Links are permanent by default (live as long as the posting is open)

### Link landing page

`/p/{link_token}` shows the posting in view mode. If the viewer is not logged in, they see the posting content with a "Log in to join" CTA. If logged in, they see the full posting with the appropriate join/request CTA.

---

## 6. Form Field Removal

The current posting form has 6 sub-forms with ~20 fields. With the text-first model and composable access, most fields move to text extraction or the context bar:

### Fields removed from the form

| Old field | Where it goes |
|---|---|
| Title | Auto-extracted from first line of text |
| Tags | Extracted from text by LLM |
| Estimated time | Extracted from text by LLM |
| Category | Extracted from text by LLM |
| Context identifier | Replaced by context (parent_posting_id) in context bar |
| Skills (picker) | Extracted from text, or `/skills` command |
| Location (mode, name, lat/lng, max distance) | Plain text or `/location` command -> mesh:location link |
| Availability (mode, windows) | Calendar integration replaces this (see scheduling-intelligence.md) |
| Visibility toggle | Replaced by composable access in context bar |

### Fields that remain (in collapsed settings)

| Field | Why it stays |
|---|---|
| Team size (min/max) | Not naturally part of text; controls posting behavior |
| Expiry | Behavioral setting |
| Auto-accept | Behavioral setting |
| N-sequential count | Behavioral setting |

### The end state

The posting creation UI becomes:

1. Text editor (with speech input, slash commands, mesh: links)
2. Context bar (context, invitees, link, discover toggle)
3. Collapsed settings row (team size, expire, accept mode, N-sequential)
4. Post button

---

## 7. Matching: Qualitative Direction

### Fast matching = hard filtering

Fast matching (Stage 1) filters clear negatives: wrong location, zero time overlap, missing required skills, wrong context. Its output is a candidate set, not a score. Users never see fast match results directly.

As context narrows, fast filtering does less work because the context already filtered:

| Check | Global posting | Channel child | Small group sub-posting |
|---|---|---|---|
| Context membership | n/a | already satisfied | already satisfied |
| Category | yes | mostly redundant | no |
| Location proximity | yes | maybe | inherited |
| Time overlap | yes | yes | availability check only |
| Skill overlap | yes | yes (more specific) | no |

### Deep matching = qualitative explanation

Deep matching (Stage 2) produces a **text explanation and a confidence level**, not a percentage score. The confidence level is coarse:

| Level | Meaning | Typical use |
|---|---|---|
| `strong` | High compatibility across multiple dimensions | Top 1-3 candidates |
| `good` | Compatible on key dimensions, some unknowns | Candidates 4-10 |
| `possible` | Some alignment, worth considering | Remaining candidates |

The explanation is always the primary output: "Strong match — you both want conversational Spanish practice at a similar level, and your Tuesday evenings overlap."

### When matching appears in the UI

| Posting type | Match UI |
|---|---|
| Private / direct invite only | Hidden — matching is irrelevant |
| Small group sub-posting | Hidden — broadcasting to members |
| Open, few applicants | Collapsed — expandable "See who matches" |
| Open, many applicants | Visible — ranked list with explanations |
| Channel child posting | In Discover ranking — explanation on tap, not a score badge |

The numeric match score still exists internally for ranking, but is not shown to users. The qualitative explanation and confidence level replace it in the UI.

---

## 8. Use Cases

These use cases test the access model from the user's perspective. Each describes what the user does, what they see, and what the expected behavior is.

### UC-A1: Public spontaneous posting

**User action**: Opens app, taps FAB, writes "Tennis Saturday afternoon, intermediate, near Englischer Garten."

**Context bar shows**: `Everyone (Discover)` (default for top-level, no invitees)

**Expected**: Posting appears in global Discover. Matching runs on all users. Acceptance mode: manual (default).

### UC-A2: Direct invite from connection profile

**User action**: Navigates to Lena's profile, taps "Do something together", writes "Coffee this week?"

**Context bar shows**: `Only Lena` (pre-filled from navigation context)

**Expected**: Posting is NOT in Discover. Lena gets an invite notification. No one else can see it unless invited or given a link.

### UC-A3: Small group invite, expanding to Discover

**User action**: Opens FAB, writes "Friday dinner, Italian, central Munich". Adds Lena, Kai, Priya as invitees.

**Context bar shows**: `Only Lena, Kai, and Priya`

**Then**: User wants to find one more person. Toggles "Add to Discover".

**Context bar shows**: `Everyone (Discover) + 3 invited`

**Expected**: Posting appears in Discover AND the three invitees get invite notifications. Strangers see it in Discover and can request to join.

### UC-A4: Small group invite with link sharing

**User action**: Same dinner setup. Instead of toggling Discover, creates a link and shares it in a WhatsApp group.

**Context bar shows**: `Lena, Kai, Priya + anyone with link`

**Expected**: Invitees get notifications. Link holders can view and request to join. Posting does NOT appear in global Discover.

### UC-A5: Sub-posting inside a small group

**User action**: Inside XHacks Team (4 members), taps compose, writes "Planning call this week - 30 min?"

**Context bar shows**: `XHacks Team (4 members)`

**Expected**: All 4 team members see the sub-posting in the group's coordination feed. No Discover listing. No matching. Acceptance mode: auto (RSVP-like).

### UC-A6: Sub-posting with outside invitee

**User action**: Same as UC-A5, but adds Prof. Weber (not a team member) as an invitee.

**Context bar shows**: `XHacks Team (4 members) + Prof. Weber`

**Expected**: Team members see it in the group. Prof. Weber gets an invite notification and can access the posting directly. Prof. Weber does NOT become a group member — they only have access to this specific sub-posting.

### UC-A7: Channel child posting

**User action**: Inside XHacks 2026 channel (200 members), posts "Building an accessibility checker. Got ML covered. Need a designer who knows WCAG."

**Context bar shows**: `XHacks 2026 (200 members)`

**Expected**: Posting is discoverable within the channel (channel-scoped Discover). Matching runs on channel members. NOT in global Discover unless explicitly toggled.

### UC-A8: Channel child promoted to global Discover

**User action**: Same as UC-A7, but user can't find a designer within the channel. Toggles "Also show in Discover".

**Context bar shows**: `XHacks 2026 (200 members) + Everyone (Discover)`

**Expected**: Posting appears in both channel-scoped AND global Discover. Matching runs on all users, but channel membership is noted as context for the deep matcher.

### UC-A9: Link-first discovery (study group)

**User action**: Creates a posting "Data Structures study group, weekly sessions, TUM library". Does NOT toggle Discover. Creates a link and shares it in the course Moodle.

**Context bar shows**: `Anyone with the link`

**Expected**: Posting is NOT in global Discover. Only reachable via the link. People who click the link see the posting and can request to join (or join if auto-accept).

### UC-A10: Connections-weighted discovery

**User action**: Creates a posting "Board game evening, looking for 2 more". Toggles Discover on.

**Expected**: Posting appears in global Discover. The matching system weights people the user already knows (connections, past co-participants) higher in ranking. This is a matching preference, not an access restriction — strangers can still discover the posting.

**Future option**: A "prefer people I know" toggle in the context bar could set a matching hint. Not an access control.

### UC-A11: Group context selected from global compose

**User action**: Opens FAB (global compose). In the context bar, searches for "XHacks Team" and selects it.

**Context bar shows**: `XHacks Team (4 members)` (same as if they had composed from inside the group)

**Expected**: Same behavior as UC-A5. The posting is a child of the XHacks Team group.

### UC-A12: Nested context chain

**User action**: University community -> Data Structures course -> Study group. Inside the study group, posts "Working session for Assignment 3 this weekend?"

**Context bar shows**: `DS Study Group (3 members)` (immediate parent context displayed)

**Expected**: The 3 group members see it. The LLM reads up the context chain (study group -> course -> university) for richer context when processing the posting. Discovery is scoped to the immediate parent's members.

---

## 9. Integration Points

- **`spec/terminology.md`**: "Visibility" is deprecated as a binary concept. The new model uses composable access paths. The `visibility` column is replaced by `in_discover` + `link_token` + invitees + context.
- **`spec/ux.md`**: The posting form is replaced by text editor + context bar + collapsed settings. Composition UX adapts to context.
- **`spec/matching.md`**: Fast matching remains for hard filtering. Deep matching shifts to qualitative explanations with coarse confidence levels. Numeric scores are internal-only for ranking.
- **`spec/nested-postings.md`**: Context inheritance and visibility inheritance are covered by this model. The `visibility` row in the inheritance table becomes: child inherits `in_discover = false` by default when parent is a group/channel; the child is discoverable within the parent's members via context, not via a visibility setting.
- **`spec/roadmap.md`**: Form removal and access model implementation are added to the milestone plan.
- **[1-text-first.md](1-text-first.md)**: The composition UX described here is the implementation of the text-first compose flow. The context bar is the "envelope" that complements the text editor.

---

## Open Questions

- **Connections as access scope**: Should "my connections" be a first-class access path (like context or Discover), or is it better modeled as a matching preference ("prefer people I know")? Current proposal: matching preference, not access control. Revisit if users frequently want hard connection-only scoping.
- **Link expiry**: Should links expire with the posting, or can they have independent expiry? Current proposal: links expire when the posting closes.
- **Multi-context**: Can a posting belong to multiple contexts (cross-posting)? Current answer: no — tree structure only, one parent. Revisit if needed.
- **Context visibility cascade**: If a parent group is private, are all children automatically private? Current proposal: yes — children inherit `in_discover = false` from private parents. A child cannot be more public than its parent.
- **Revoking access**: Can a poster remove someone from the audience after posting? For invitees: yes (revoke invite). For context members: only by removing them from the group. For link holders: revoke the link (generate new token).
