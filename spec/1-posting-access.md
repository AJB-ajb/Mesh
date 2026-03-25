# Posting Access & Composition

> Composable access model for postings — how Space membership, invites, links, and the Global Space compose to determine audience. Replaces the binary visibility enum. With the Spaces model ([1-spaces.md](1-spaces.md)), a posting lives within a Space and its audience is primarily the Space's members, extended by the paths below.

---

## 1. Composable Access Model

Instead of a single visibility field, a posting's audience is composed from independent building blocks:

### The four access paths

| Path         | What it does                                                  | How the user activates it                                                            |
| ------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **Context**  | The posting is visible to members of the Space it's posted in | Post within a Space, or select a Space in the context bar                            |
| **Invite**   | Specific people get notified and can access the posting       | Add people in the invite field, or `/invite @name`                                   |
| **Link**     | Anyone with the URL can view the posting                      | Create a link via the context bar or `/link`                                         |
| **Discover** | The posting appears in the Global Space (Explore)             | Toggle in the context bar (default for postings without a Space context or invitees) |

### How they compose

The effective audience is the union of all active paths:

```
audience = space_members (if Space set)
         + invitees (always)
         + link_holders (if link created)
         + all_users (if in Global Space / Explore)
```

Each path is independent. Activating one doesn't deactivate another. A posting can be in a Space AND have outside invitees AND have a shareable link AND appear in the Global Space (Explore) — or any subset.

### Acceptance mode is orthogonal

How someone **joins** is controlled by the acceptance mode, which applies uniformly to everyone in the audience regardless of how they found the posting:

- **auto_accept = true**: anyone in the audience can join immediately ("Join")
- **auto_accept = false**: anyone in the audience can request to join; poster reviews ("Request to join")

Exception: explicit invitees always get a direct "Accept invite" / "Decline" flow, bypassing the request step.

### What the data model stores

```
postings:
  space_id            uuid     -- the Space the posting belongs to (nullable, FK -> spaces.id)
  in_discover         boolean  -- appears in the Global Space (Explore)
  link_token          text     -- shareable link token (nullable; null = no link)
  auto_accept         boolean  -- join vs request-to-join

posting_invites:
  posting_id          uuid
  user_id             uuid
  status              text     -- pending | accepted | declined
```

- `space_id` set -> visible to the Space's members
- `in_discover = true` -> appears in the Global Space (Explore)
- `link_token` not null -> accessible via `/p/{link_token}`
- Invitees always have access regardless of other settings

---

## 2. Defaults By Composition Context

The system sets sensible defaults based on where the user starts composing:

| Where you compose from          | Context    | In Discover       | Invitees         | Acceptance |
| ------------------------------- | ---------- | ----------------- | ---------------- | ---------- |
| Global FAB / Explore            | none       | yes               | none             | manual     |
| A connection's profile          | none       | no                | that person      | auto       |
| Inside a small Space            | that Space | no                | none (broadcast) | auto       |
| Inside a large Space            | that Space | no (within Space) | none             | manual     |
| Global FAB, then select a Space | that Space | no                | none             | auto       |

Users can always override any default. The defaults just minimize decisions for common cases.

### Context selection from global compose

The compose context bar includes a Space search. Users don't need to navigate into a Space to post to it — they can search and select a Space from the global compose screen. When a Space is selected, defaults update accordingly.

---

## 3. Composition UX: The Context Bar

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

| State                                               | Summary                                 |
| --------------------------------------------------- | --------------------------------------- |
| No context, no invitees, in_discover=true           | "Everyone (Discover)"                   |
| No context, invitees=[Lena], in_discover=false      | "Only Lena"                             |
| No context, invitees=[Lena, Kai], in_discover=false | "Only Lena and Kai"                     |
| No context, invitees=[Lena], in_discover=true       | "Everyone (Discover) + Lena invited"    |
| Context=XHacks Team, in_discover=false              | "XHacks Team (4 members)"               |
| Context=XHacks Team, invitees=[Prof. Weber]         | "XHacks Team (4 members) + Prof. Weber" |
| No context, link created, in_discover=false         | "Anyone with the link"                  |
| No context, invitees=[Lena], link created           | "Lena + anyone with the link"           |

### Settings row

Collapsed by default. Contains:

| Setting             | Command       | Default                            |
| ------------------- | ------------- | ---------------------------------- |
| Team size (min/max) | `/size`       | 1–5                                |
| Expiry              | `/expire`     | 3 days                             |
| Acceptance mode     | `/autoaccept` | depends on context (see Section 3) |
| N-sequential count  | `/sequential` | 1                                  |

All settings can also be set via slash commands. The commands are "stateful" — they modify posting state without inserting text into the editor.

---

## 4. Links

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

## 5. Matching: Qualitative Direction

### Fast matching = hard filtering

Fast matching (Stage 1) filters clear negatives: wrong location, zero time overlap, missing required skills, wrong context. Its output is a candidate set, not a score. Users never see fast match results directly.

As context narrows, fast filtering does less work because the context already filtered:

| Check              | Global posting | Channel child       | Small group sub-posting |
| ------------------ | -------------- | ------------------- | ----------------------- |
| Context membership | n/a            | already satisfied   | already satisfied       |
| Category           | yes            | mostly redundant    | no                      |
| Location proximity | yes            | maybe               | inherited               |
| Time overlap       | yes            | yes                 | availability check only |
| Skill overlap      | yes            | yes (more specific) | no                      |

### Deep matching = qualitative explanation

Deep matching (Stage 2) produces a **text explanation and a confidence level**, not a percentage score. The confidence level is coarse:

| Level      | Meaning                                       | Typical use          |
| ---------- | --------------------------------------------- | -------------------- |
| `strong`   | High compatibility across multiple dimensions | Top 1-3 candidates   |
| `good`     | Compatible on key dimensions, some unknowns   | Candidates 4-10      |
| `possible` | Some alignment, worth considering             | Remaining candidates |

The explanation is always the primary output: "Strong match — you both want conversational Spanish practice at a similar level, and your Tuesday evenings overlap."

### When matching appears in the UI

| Posting type                 | Match UI                                                    |
| ---------------------------- | ----------------------------------------------------------- |
| Private / direct invite only | Hidden — matching is irrelevant                             |
| Small group sub-posting      | Hidden — broadcasting to members                            |
| Open, few applicants         | Collapsed — expandable "See who matches"                    |
| Open, many applicants        | Visible — ranked list with explanations                     |
| Channel child posting        | In Discover ranking — explanation on tap, not a score badge |

The numeric match score still exists internally for ranking, but is not shown to users. The qualitative explanation and confidence level replace it in the UI.

---

## 6. Use Cases

These use cases test the access model from the user's perspective. Each describes what the user does, what they see, and what the expected behavior is.

### UC-A1: Public spontaneous posting

**User action**: Opens app, taps FAB, writes "Tennis Saturday afternoon, intermediate, near Englischer Garten."

**Context bar shows**: `Everyone (Explore)` (default for no Space context, no invitees)

**Expected**: Posting appears in the Global Space (Explore). Matching runs on all users. Acceptance mode: manual (default).

### UC-A2: Direct invite from connection profile

**User action**: Navigates to Lena's profile, taps "Do something together", writes "Coffee this week?"

**Context bar shows**: `Only Lena` (pre-filled from navigation context)

**Expected**: Posting is NOT in the Global Space. Lena gets an invite notification. No one else can see it unless invited or given a link.

### UC-A3: Small group invite, expanding to Explore

**User action**: Opens FAB, writes "Friday dinner, Italian, central Munich". Adds Lena, Kai, Priya as invitees.

**Context bar shows**: `Only Lena, Kai, and Priya`

**Then**: User wants to find one more person. Toggles "Add to Explore".

**Context bar shows**: `Everyone (Explore) + 3 invited`

**Expected**: Posting appears in the Global Space (Explore) AND the three invitees get invite notifications. Strangers see it in Explore and can request to join.

### UC-A4: Small group invite with link sharing

**User action**: Same dinner setup. Instead of toggling Discover, creates a link and shares it in a WhatsApp group.

**Context bar shows**: `Lena, Kai, Priya + anyone with link`

**Expected**: Invitees get notifications. Link holders can view and request to join. Posting does NOT appear in the Global Space.

### UC-A5: Posting-message inside a small Space

**User action**: Inside XHacks Team Space (4 members), taps compose, writes "Planning call this week - 30 min?"

**Context bar shows**: `XHacks Team (4 members)`

**Expected**: All 4 Space members see the posting-message in the Space's conversation. No Explore listing. No matching. Acceptance mode: auto (RSVP-like).

### UC-A6: Posting-message with outside invitee

**User action**: Same as UC-A5, but adds Prof. Weber (not a Space member) as an invitee.

**Context bar shows**: `XHacks Team (4 members) + Prof. Weber`

**Expected**: Space members see it in the Space. Prof. Weber gets an invite notification and can access the posting directly. Prof. Weber does NOT become a Space member — they only have access to this specific posting.

### UC-A7: Posting-message in a large Space

**User action**: Inside XHacks 2026 Space (200 members), posts "Building an accessibility checker. Got ML covered. Need a designer who knows WCAG."

**Context bar shows**: `XHacks 2026 (200 members)`

**Expected**: Posting is visible to Space members. Matching runs on Space members. NOT in the Global Space (Explore) unless explicitly toggled.

### UC-A8: Space posting promoted to Explore

**User action**: Same as UC-A7, but user can't find a designer within the Space. Toggles "Also show in Explore".

**Context bar shows**: `XHacks 2026 (200 members) + Everyone (Explore)`

**Expected**: Posting appears in both the Space AND the Global Space (Explore). Matching runs on all users, but Space membership is noted as context for the deep matcher.

### UC-A9: Link-first discovery (study group)

**User action**: Creates a posting "Data Structures study group, weekly sessions, TUM library". Does NOT toggle Discover. Creates a link and shares it in the course Moodle.

**Context bar shows**: `Anyone with the link`

**Expected**: Posting is NOT in the Global Space. Only reachable via the link. People who click the link see the posting and can request to join (or join if auto-accept).

### UC-A10: Connections-weighted discovery

**User action**: Creates a posting "Board game evening, looking for 2 more". Toggles Discover on.

**Expected**: Posting appears in the Global Space (Explore). The matching system weights people the user already knows (connections, past co-participants) higher in ranking. This is a matching preference, not an access restriction — strangers can still discover the posting.

**Future option**: A "prefer people I know" toggle in the context bar could set a matching hint. Not an access control.

### UC-A11: Space context selected from global compose

**User action**: Opens FAB (global compose). In the context bar, searches for "XHacks Team" and selects it.

**Context bar shows**: `XHacks Team (4 members)` (same as if they had composed from inside the Space)

**Expected**: Same behavior as UC-A5. The posting belongs to the XHacks Team Space.

### UC-A12: Nested Space chain

**User action**: University community -> Data Structures course -> Study group. Inside the study group Space, posts "Working session for Assignment 3 this weekend?"

**Context bar shows**: `DS Study Group (3 members)` (immediate parent Space displayed)

**Expected**: The 3 Space members see it. The LLM reads up the Space hierarchy (study group -> course -> university) for richer context when processing the posting. Visibility is scoped to the immediate Space's members.

---

## Open Questions

- **Connections as access scope**: Should "my connections" be a first-class access path (like context or Discover), or is it better modeled as a matching preference ("prefer people I know")? Current proposal: matching preference, not access control. Revisit if users frequently want hard connection-only scoping.
- **Link expiry**: Should links expire with the posting, or can they have independent expiry? Current proposal: links expire when the posting closes.
- **Multi-context**: Can a posting belong to multiple Spaces (cross-posting)? Current answer: no — tree structure only, one parent Space. Revisit if needed.
- **Space visibility cascade**: If a parent Space is private, are all child Spaces automatically private? Current proposal: yes — children inherit `in_discover = false` from private parents. A child cannot be more public than its parent.
- **Revoking access**: Can a poster remove someone from the audience after posting? For invitees: yes (revoke invite). For Space members: only by removing them from the Space. For link holders: revoke the link (generate new token).

---

## Current Deviations

- **Composable access model**: In expand phase — `in_discover` and `link_token` columns added (migration `20260306100000`), but old `visibility` enum still active in RLS policies. The four independent access paths (Context, Invite, Link, Discover) and context bar are target state. → v0.9+
- **Qualitative match display**: Match scores are shown as numeric percentages in the UI, not as coarse confidence levels (`strong`/`good`/`possible`) with text explanations. → v0.9+
