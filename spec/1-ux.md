# UX Spec

> UX principles, layout architecture, page structure, interaction patterns, and voice & tone.

## Design Principles

1. **Minimal friction** — no required configuration, one-click OAuth, 30-second onboarding (see below)
2. **Fast, simple, efficient usage**
   - **Text-first:** the default input is a single text field — write what you want, post it, done. Structure is derived from text, not inputted through forms. See [1-text-first.md](1-text-first.md).
   - **Keyboard-first:** text fields are navigable and completable via keyboard (Tab, Enter, shortcuts)
3. **Idea-first** — start from what you want to do, not from building a profile
4. **Natural language interface** — voice and text input, AI extracts structured data
5. **Good enough matching** — cover common cases well; better than random, not perfect
6. **High responsiveness** — Spaces should feel fresh and active; instant notifications for time-critical items
7. **Honest language** — prefer precise, qualified claims over absolutes. See [Voice & Tone](#voice--tone) below.

## Voice & Tone

Mesh copy should sound honest and precise. Avoid the hyperbolic language common in startup marketing — it erodes trust and makes claims indistinguishable from noise.

### Rules

1. **Prefer qualifiers over absolutes.** Use "most", "often", "tends to", "usually", "can" instead of "all", "never", "always", "every", "guaranteed". A qualified truth is more credible than an unqualified claim.
2. **Avoid superlatives you can't prove.** "A faster way" instead of "the fastest way". "Better matching" instead of "the best matching". If we genuinely are the only/best at something, cite evidence — don't just assert it.
3. **Don't imply hard limits.** Mesh works well for small groups, but we don't restrict team size. Say "the number is usually 2–5" (observation), not "for teams of 2–5" (restriction).
4. **Describe competitors fairly.** "Group chats mostly reach people you already know" is accurate. "Group chats can't do X" is probably wrong — someone will find a counterexample, and then we look dishonest.
5. **Let the product speak.** Concrete details ("describe your idea in 30 seconds") beat vague promises ("revolutionary matching"). Show the mechanism, not just the claim.
6. **Keep it short.** One qualifier per claim is enough. "Can outperform" is honest and punchy. "Can often tend to outperform" is mush. Prefer "can" over longer hedges when it works.

### Examples

| Avoid                               | Prefer                                 |
| ----------------------------------- | -------------------------------------- |
| "The fastest way to build a team"   | "A faster way to go from idea to team" |
| "Never miss a match"                | "See matches as they come in"          |
| "Built for crowds, not small teams" | "Designed for larger gatherings"       |
| "None of these tools solve this"    | "They rarely start with your idea"     |
| "Small teams always outperform"     | "Smaller teams can move faster"        |

This applies to all user-facing text in `src/lib/labels.ts`, marketing pages, and documentation.

## Mobile-First Design

The app targets 70% mobile usage. All layouts and interactions are designed mobile-first, then enhanced for desktop.

### Layout Architecture

| Viewport         | Navigation              | Header                                          | Content                           |
| ---------------- | ----------------------- | ----------------------------------------------- | --------------------------------- |
| Mobile (<768px)  | Bottom tab bar (3 tabs) | Space name or logo + theme toggle + user avatar | Full-width, padded for bottom bar |
| Desktop (≥768px) | Sidebar (collapsible)   | Global search + user menu                       | Sidebar offset                    |

### Bottom Tab Bar (mobile)

Fixed bar at the bottom of the screen with three tabs:

- **Spaces** (`/spaces`) — MessageSquare icon
- **Activity** (`/activity`) — Bell icon
- **Profile** (`/profile`) — User icon

Active tab is highlighted. Badge counts for unread items per tab (unread Spaces count on the Spaces tab, pending action count on the Activity tab). Hidden when the mobile keyboard is open. Safe area padding for notched devices (`env(safe-area-inset-bottom)`). Minimum 44px touch targets.

### Floating Action Button (mobile)

A "+" button fixed above the bottom bar (right side). Opens a compose flow: create a new Space, or compose a message/posting in an existing Space. Hidden when keyboard is open.

### Mobile Command Palette

On mobile, slash commands are accessed via a **"/" button** near the editor (not the FAB "+"). Tapping it opens a **bottom sheet** with the full command list. This replaces the cursor-position dropdown used on desktop, which has viewport/keyboard positioning issues on mobile.

- **"/" button** — positioned near the editor toolbar. Visually distinct from the FAB "+" (which creates new Spaces/postings). Self-documenting: it hints that slash commands are available.
- **Bottom sheet** — slides up from the bottom of the screen. Shows all available commands for the current context (Space compose vs. profile). Tapping a command executes it (opens overlay, inserts text, etc.). Dismissible by swiping down or tapping outside.
- **Desktop** — typing "/" inline in the editor still triggers the cursor-position dropdown as before. The bottom sheet is mobile-only.
- **Touch handling** — all interactive elements in the command system use `onPointerDown` (not `onMouseDown`) for cross-device compatibility. Menu items have minimum 44px touch targets.

### Simplified Mobile Header

On mobile, the header shows only:

- Logo or Space name (left) — contextual: logo on list screens, Space name inside a Space
- Theme toggle
- User avatar (profile/settings access)

Global search is hidden on mobile (search is available within the Spaces list and within individual Spaces). Notifications are distributed via badge counts on the bottom bar tabs and the Activity tab.

### Desktop Sidebar

Collapsible sidebar with navigation sections matching the bottom tab bar: Spaces, Activity, Profile/Settings. The Space list is the main content area. "New Space" CTA button in the sidebar.

## Pages & Navigation

### Routes

| Page            | Route              | Description                                                                                |
| --------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| Landing         | `/`                | Hero, features, CTA                                                                        |
| Login           | `/login`           | Email/password + OAuth (Google, GitHub, LinkedIn)                                          |
| Sign up         | `/signup`          | Registration                                                                               |
| Forgot password | `/forgot-password` | Recovery email                                                                             |
| Reset password  | `/reset-password`  | Reset form                                                                                 |
| Onboarding      | `/onboarding`      | Profile setup (paste text, guided prompts, or skip)                                        |
| Space list      | `/spaces`          | List of user's Spaces sorted by last activity, with filter chips and search                |
| Space view      | `/spaces/[id]`     | Conversation timeline with messages and posting-messages; compose area at bottom           |
| Activity        | `/activity`        | Personal action cards: matches, invites, scheduling, connection requests                   |
| Profile         | `/profile`         | Text-first profile editor with slash commands, extracted metadata, availability + calendar |
| Settings        | `/settings`        | Connected accounts, notification preferences, sign out, danger zone (delete account)       |

### Removed/Changed pages

| Old page                          | Disposition                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Discover (`/discover`)            | Replaced by the Global Space ("Explore"), pinned at the top of the Space list                         |
| Posts (`/posts`)                  | Removed. Active postings live within their Spaces as posting-messages                                 |
| Connections (`/connections`)      | DMs are 2-person Spaces in the Space list. Connection management moves to Profile                     |
| My Postings (`/my-postings`)      | Removed. User's own postings are visible in the Spaces they belong to                                 |
| Active (`/active`)                | Removed. All active Spaces with recent coordination are in the Space list                             |
| Posting detail (`/postings/[id]`) | Posting is a message within a Space conversation. Detail accessed by tapping the posting-message card |
| Create posting (`/postings/new`)  | Posting creation is inline via the compose area within a Space view (Message/Posting toggle)          |
| Notifications bell                | Replaced by the Activity tab for actionable items. Unread badges on Spaces for messages               |

### Navigation structure

- **Bottom tab bar (mobile):** Spaces, Activity, Profile
- **Sidebar main (desktop):** Spaces, Activity, Profile, Settings
- **Sidebar CTA (desktop):** New Space button
- **FAB (mobile):** Floating "+" button — new Space or compose in existing Space
- **Header:** Theme toggle, user avatar (mobile); global search, user menu (desktop)
- **Default landing page:** Space list (`/spaces`)

## Onboarding Flow

Target: a not-yet-registered user with a written project description can start coordinating in **under 30 seconds**.

1. Click "Start coordinating" CTA on landing page
2. OAuth login (Google, GitHub, LinkedIn — one click)
3. Paste project description into free-form field
4. Post — creates a Space with the description as state text and a posting-message

Personal profile configuration is **not required** to create a posting or a Space. It can be completed later to improve matching quality. See [0-vision.md](0-vision.md) for the product reasoning behind this.

## Page Layouts

### Space List (`/spaces`)

The primary screen. A messenger-style list of the user's Spaces, sorted by last activity. See [1-spaces.md](1-spaces.md) for the Space data model.

- **Search bar** at top — search across Space names, state text, and messages
- **Filter chips** (horizontally scrollable): All, Groups, DMs, Communities, Pinned, Archived
- **Explore (Global Space)** pinned at the top of the list — the discovery surface
- **Space rows** showing:
  - Space avatar and name (for 2-person Spaces: the other person's avatar and name)
  - Last message/posting preview text
  - Timestamp of last activity
  - Unread badge count
- **Per-Space actions** (swipe or long-press): Pin, Mute, Archive
- **Empty state:** nudge to explore the Global Space or create a new Space

### Space View (`/spaces/[id]`)

A conversation timeline view. The single layout that works for all Space sizes (2-person DMs, small groups, large communities). See [1-spaces.md](1-spaces.md) for details on progressive feature enablement by size.

**Layout:**

```
┌─────────────────────────┐
│ Space Name    [i] [...]│  ← header: name, info panel, settings
├─────────────────────────┤
│ State text (collapsed)  │  ← tap to expand / edit (privileged members)
├─────────────────────────┤
│                         │
│ [message]               │
│ [message]               │
│ [posting-card]          │  ← posting-message rendered as card
│   └ 3 replies           │  ← sub-Space thread, collapsed
│ [message]               │
│ [rich-card: time poll]  │  ← shared interactive card
│                         │
├─────────────────────────┤
│ [text input] [M|P] [→] │  ← compose: Message/Posting toggle
└─────────────────────────┘
```

**Header and info panel:**

- Space name and avatar
- Member count
- Tap header or [i] button to open info panel: state text (full, editable for privileged members), member list, Space settings, mute/pin controls

**Conversation timeline:**

- Messages and posting-messages interleaved chronologically
- **Posting-messages** render as structured cards: title, text preview, status badge (open/active/closed), capacity indicator, CTA (Join/Apply)
- **Sub-Spaces** render as collapsible threads anchored to their posting-message card. Collapsed by default ("3 replies"). Expandable inline; tap to open full-screen for long threads
- **Rich interactive cards** (time proposals, RSVPs, polls, task claims) render inline in the timeline. Members interact via taps
- Real-time updates: new messages, typing indicators, card state changes

**Compose area:**

- Text input (same markdown editor as elsewhere)
- **Message/Posting toggle**: switches between sending a regular message and creating a posting-message
- When set to **Posting**: additional controls surface inline (capacity, deadline, matching toggle, visibility) — same properties as current posting creation, but within the conversation
- In **posting-only Spaces** (e.g., Explore/Global Space): toggle is locked to Posting
- Slash commands available via "/" button (mobile) or inline "/" (desktop)

**Large Spaces (posting-only mode):**

When a Space has posting-only mode enabled (common for large communities, always for the Global Space), the view adapts:

```
┌─────────────────────────┐
│ Space Name    [i] [...]│
├─────────────────────────┤
│ State text (summary)    │
├─────────────────────────┤
│ [filter chips] [search] │  ← category, location, etc.
├─────────────────────────┤
│ [posting-card + score]  │
│ [posting-card + score]  │  ← sorted by match score or recency
│ [posting-card + score]  │
│                         │
├─────────────────────────┤
│ [compose posting] [→]   │  ← posting-only compose
└─────────────────────────┘
```

- Filter chips and search for browsing posting-messages
- Match scores shown on posting-message cards
- Posting-messages are sortable by match score (default) or recency

### Explore (Global Space)

The Global Space is named "Explore" to users. It is the discovery surface, replacing the old Discover page.

- **Pinned at the top** of the Space list (always visible)
- **Posting-only** — no regular messages. A stream of posting-messages from all users
- **Filterable and searchable**: chip filters (category, location, etc.), search bar, sort by match score or recency
- **Match scores** displayed on each posting-message card
- **Matching surfaces relevant postings** — not a raw chronological feed. The system highlights what is relevant to each user
- Tapping a posting-message card shows its detail and sub-Space thread

### Activity (`/activity`)

The personal inbox of things that need your response. Contains **action cards** — items generated by Mesh's coordination intelligence. This replaces the old notifications bell dropdown for actionable items.

- **Match cards**: "New posting matches you" — posting text + match score + match explanation + **Join / Pass** buttons
- **Invite cards**: "Alex invited you to [Space]" — who invited, posting/Space context + **Accept / Decline** buttons
- **Scheduling cards**: personalized time proposals needing your response — "Your meeting ends at 19:00, you'd arrive ~19:30" + time slot options
- **Connection request cards**: incoming connection requests with **Accept / Decline** buttons
- **RSVP request cards**: recurring session confirmations needing your response

Each card has inline actions. Tapping an action (e.g., Join) lands you directly in the relevant Space. Cards are dismissed once acted on.

**What does NOT appear here:** Non-actionable notifications (someone joined a Space, a new message was sent, someone reacted). Those appear as unread badges on the Space in the Space list.

Activity tab + per-Space badges work together:

- **Activity tab**: aggregated triage — "what needs my response across all Spaces?"
- **Per-Space badges**: contextual — "what's new in this specific Space?"

### Profile (`/profile`)

Text-first profile editor. Mirrors the posting creation paradigm: the primary input is a text field, structure is extracted.

**Page structure:**

1. **Header** — avatar + name + headline. Inline-editable (tap to edit).
2. **Profile editor** — MeshEditor (same as posting creation). The user's bio/description is the primary content. Slash commands available for structured input. Speech input supported.
3. **Extracted metadata** — displayed below the editor as read-only badges/tags. Skills (badges with level), location, languages, interests. These are derived from the profile text via LLM extraction, not inputted through forms. Tapping a badge opens the relevant picker for manual correction.
4. **Availability + Calendar** — the one remaining interactive section. Shows the availability grid/calendar week view, with a "Connect calendar" button inline. Busy blocks from connected calendars overlay on the availability display. This section is always visible (not collapsed) because it's inherently visual and not text-derivable.
5. **Connections** — list of connections with quick access to their DM Spaces. Add connection (search by name/email), QR code (show/scan), share profile link.
6. **Connected accounts** — at the bottom. Shows linked OAuth providers (Google, GitHub, LinkedIn) with connect/disconnect.

**No view/edit toggle.** The profile is always in an editable state. There is no separate "view mode" — the editor is the profile.

**Profile slash commands:**

| Command         | Type         | Description                                                                                                                                        |
| --------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/skills`       | overlay      | Opens skill picker for structured skill selection with levels                                                                                      |
| `/location`     | overlay      | Location search with geocoding                                                                                                                     |
| `/availability` | overlay      | Opens availability editor (quick grid or detailed calendar)                                                                                        |
| `/calendar`     | action       | Connect or manage calendar integrations (Google Calendar, iCal feeds)                                                                              |
| `/update`       | inline input | NL instruction for AI-driven profile changes (e.g., `/update add Python at expert level`). LLM applies changes to profile text + extracted fields. |
| `/format`       | immediate    | Auto-format profile text (markdown structure)                                                                                                      |
| `/clean`        | immediate    | Auto-correct grammar and spelling                                                                                                                  |

**Skills are text-derived.** Unlike the current form-based skill picker, skills are primarily extracted from the profile text. The `/skills` command and skill picker remain available for precision (adding specific skills, setting levels), but the default path is: write about yourself → skills are extracted. The structured skill data exists for matching but is not a form the user manages.

**Calendar promotion.** Calendar connect is surfaced directly in the profile's availability section — not buried in Settings. When a calendar is connected, busy blocks appear as an overlay on the availability display. Calendar visibility settings (match_only, team_visible) are accessible here.

### Settings (`/settings`)

Slimmed down to configuration-only concerns. Calendar and profile-related features moved to Profile.

- **Connected accounts** — OAuth providers (Google, GitHub, LinkedIn) with connect/disconnect/primary indicators
- **GitHub sync** — sync status and extracted data (shown only when GitHub is connected)
- **Notification preferences** — per-type, per-channel toggles
- **Sign out** — regular action button (not in danger zone)
- **Danger zone** — destructive actions only: delete account

**Removed from Settings:**

- Calendar settings → moved to Profile (availability + calendar section)
- Account info display (email, persona) → moved to Profile header or kept minimal

## Interaction Patterns

- **AI compatibility scores** shown on posting-message cards in the Explore/Global Space and on match cards in the Activity tab. Hidden in DM Spaces and small group conversations where matching is not relevant.
- **Real-time messaging** with typing indicators and presence status — within any Space conversation (DM, group, or community)
- **Progressive disclosure:** empty states guide the user to their next action (empty Space list → Explore, empty Activity → browse Spaces)
- **Invite:** invite connections to any Space or posting-message. Two modes:
  - **Sequential:** rank connections by preference, send invites one-by-one until someone accepts. On decline, the next connection is auto-invited.
  - **Parallel:** invite all selected connections at once. First to accept wins; others are notified the spot is taken.
    Invitees see an invite card in their Activity tab with inline **Join / Decline** buttons.
- **Posting lifecycle:** a posting-message becomes "active" once min capacity is reached. Active postings show a status badge on their card in the Space conversation. A posting can be simultaneously open for recruiting and active for coordination within its sub-Space.
- **Waitlist**: When a posting-message is filled, the CTA changes to "Join waitlist" (auto-accept) or "Request to join waitlist" (manual review). Users see their waitlist position. The posting creator sees waitlisted people in the posting detail.
- **Invitations** are a persistent posting feature — accessible during posting-message creation and throughout the posting lifecycle, not just after team formation.
- **Rich interactive cards** in Space conversations: time proposals, RSVPs, polls, task claims, location confirms. Members interact via taps instead of writing messages. Cards update live as members respond. See the design document (`spec/designs/spaces-rewrite.md`, Section 10) for the full card type catalog.
- **Voice input** for posting creation and natural language filtering
- `[planned]` **AI-generated daily digest** notifications for large Spaces

### Text-First Input

The posting and profile input paradigm is text-first. See [1-text-first.md](1-text-first.md) for the full spec. Key points:

- **Primary input is a text field**, not a multi-step form. Write what you want, send it, done.
- **Structure is derived, not inputted.** LLM extracts metadata (skills, time, location, category) from text in the background after posting.
- **Posting is instant.** Extraction and matching happen after the posting-message is live — no gating on LLM processing.
- **Markdown format.** Lightweight markdown (bold, lists, headings, inline code, links). Edit mode shows syntax-highlighted markers (e.g., `**bold**` renders bold but keeps the `**` visible). View mode fully renders.
- **`mesh:` link syntax** for optional precision — `[location](mesh:location?lat=...&lng=...)` embeds structured metadata in the text. Slash commands insert these; plain text is always fine too.
- **`||hidden||` content** — text wrapped in `||` markers is hidden until acceptance. Solves the "send me the details" back-and-forth. Works in both posting-messages and Space state text.
- **`||?||` prompts** — questions wrapped in `||?` markers become interactive form elements on acceptance (LLM converts natural language to UI).
- **Slash commands** as a command palette — content commands (`/time`, `/location`, `/skills`, `/template`, `/hidden`), setting commands (`/visibility`, `/size`, `/autoaccept`), and action commands (`/invite`, `/link`, `/repost`, `/format`, `/clean`). Tab completes, Enter executes. On mobile, accessed via a "/" button that opens a bottom sheet (see [Mobile Command Palette](#mobile-command-palette)).
- **Text tools**: Auto-format adds markdown structure, Auto-clean corrects grammar/spelling. Both apply directly with inline undo.
- **`/update` command** (profile context) — takes an NL instruction as inline argument (e.g., `/update add Python at expert level`) or opens an inline text input. LLM applies changes to the profile text and re-extracts structured fields.
- **Quick chips and post-write nudges**: Deferred — focus on core flow first. Revisit when base editor and commands are polished.

**Profile text-first parity.** The profile uses the same text-first paradigm as postings. The user's bio/description is the single source of truth — skills, location, languages, and interests are extracted from it. Form-based profile fields (fullName, headline, bio form, skills form, interests input, etc.) are deprecated in favor of the unified text editor with slash commands. Availability remains as an explicit interactive section because it is inherently visual.

## Current Deviations

The following describes the gap between this spec and the current implementation:

- **Navigation**: The app currently uses a 3-tab bottom bar (Discover/Posts/Connections) and a notifications bell. The Spaces/Activity/Profile navigation described here is not yet implemented.
- **Space list**: The `/spaces` route and messenger-style Space list do not exist yet. The current landing page is `/posts`.
- **Space view**: The `/spaces/[id]` conversation timeline view with interleaved messages and posting-messages does not exist yet. The current posting detail is at `/postings/[id]` with a tabbed Edit/Manage/Project layout.
- **Activity tab**: The `/activity` route with personal action cards does not exist yet. Actionable items currently surface via the notifications bell dropdown.
- **Explore (Global Space)**: The Global Space concept is not yet implemented. Discovery currently uses the `/discover` feed.
- **Posting creation**: Postings are currently created via a standalone `/postings/new` flow, not via a compose area within a Space conversation.
- **Rich interactive cards**: Time proposals, RSVPs, polls, task claims, and other interactive cards in conversations are not yet implemented.
- **Connections**: DMs and connection management currently live at `/connections`. These need to migrate to 2-person Spaces in the Space list and to the Profile page respectively.
