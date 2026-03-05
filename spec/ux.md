# UX Spec

## Design Principles

1. **Minimal friction** — no required configuration, one-click OAuth, 30-second onboarding (see below)
2. **Fast, simple, efficient usage**
   - **Text-first:** the default input is a single text field — write what you want, post it, done. Structure is derived from text, not inputted through forms. See [text_first_rewrite.md](../.prompts/text_first_rewrite.md).
   - **Keyboard-first:** text fields are navigable and completable via keyboard (Tab, Enter, shortcuts)
3. **Idea-first** — start from what you want to do, not from building a profile
4. **Natural language interface** — voice and text input, AI extracts structured data
5. **Good enough matching** — cover common cases well; better than random, not perfect
6. **High responsiveness** — postings should feel fresh and active; instant notifications for time-critical items
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

| Viewport         | Navigation              | Header                                    | Content                           |
| ---------------- | ----------------------- | ----------------------------------------- | --------------------------------- |
| Mobile (<768px)  | Bottom tab bar (3 tabs) | Logo + theme toggle + user avatar         | Full-width, padded for bottom bar |
| Desktop (≥768px) | Sidebar (collapsible)   | Global search + notifications + user menu | Sidebar offset                    |

### Bottom Tab Bar (mobile)

Fixed bar at the bottom of the screen with three tabs:

- **Discover** (`/discover`) — Compass icon
- **Posts** (`/posts`) — FolderKanban icon
- **Connections** (`/connections`) — Users icon

Active tab is highlighted. Badge counts for unread items per tab. Hidden when the mobile keyboard is open. Safe area padding for notched devices (`env(safe-area-inset-bottom)`). Minimum 44px touch targets.

### Floating Action Button (mobile)

A "+" button fixed above the bottom bar (right side) linking to `/postings/new`. Hidden when keyboard is open.

### Mobile Command Palette

On mobile, slash commands are accessed via a **"/" button** near the editor (not the FAB "+"). Tapping it opens a **bottom sheet** with the full command list. This replaces the cursor-position dropdown used on desktop, which has viewport/keyboard positioning issues on mobile.

- **"/" button** — positioned near the editor toolbar. Visually distinct from the FAB "+" (which creates new postings). Self-documenting: it hints that slash commands are available.
- **Bottom sheet** — slides up from the bottom of the screen. Shows all available commands for the current context (posting vs. profile). Tapping a command executes it (opens overlay, inserts text, etc.). Dismissible by swiping down or tapping outside.
- **Desktop** — typing "/" inline in the editor still triggers the cursor-position dropdown as before. The bottom sheet is mobile-only.
- **Touch handling** — all interactive elements in the command system use `onPointerDown` (not `onMouseDown`) for cross-device compatibility. Menu items have minimum 44px touch targets.

### Simplified Mobile Header

On mobile, the header shows only:

- Logo (left)
- Theme toggle
- User avatar (profile/settings access)

Global search and notifications dropdown are hidden on mobile. Notifications are distributed via badge counts on the bottom bar tabs instead.

### Desktop Sidebar

Unchanged from current behavior — collapsible sidebar with all navigation items plus "New Posting" CTA. Profile and Settings in secondary navigation.

## Pages & Navigation

### Routes

| Page                   | Route                   | Description                                                                                |
| ---------------------- | ----------------------- | ------------------------------------------------------------------------------------------ |
| Landing                | `/`                     | Hero, features, CTA                                                                        |
| Login                  | `/login`                | Email/password + OAuth (Google, GitHub, LinkedIn)                                          |
| Sign up                | `/signup`               | Registration                                                                               |
| Forgot password        | `/forgot-password`      | Recovery email                                                                             |
| Reset password         | `/reset-password`       | Reset form                                                                                 |
| Onboarding             | `/onboarding`           | Persona selection (developer / posting creator)                                            |
| Onboarding — profile   | `/onboarding/developer` | Voice/text profile setup                                                                   |
| Discover               | `/discover`             | Single feed of all postings, sorted by match score, with saved filter                      |
| Posts                  | `/posts`                | Merged view: user's created, joined, applied, and completed postings with filter chips     |
| Create posting         | `/postings/new`         | Free-form input + AI extraction                                                            |
| Posting detail         | `/postings/[id]`        | Tabbed view: Edit · Manage · Project                                                       |
| Connections            | `/connections`          | Connections list with DMs, requests, add/QR                                                |
| My Postings (redirect) | `/my-postings`          | Redirects to `/posts?filter=created`                                                       |
| Active (redirect)      | `/active`               | Redirects to `/posts?filter=joined`                                                        |
| Profile                | `/profile`              | Text-first profile editor with slash commands, extracted metadata, availability + calendar |
| Settings               | `/settings`             | Connected accounts, notification preferences, sign out, danger zone (delete account)       |

### Removed pages

| Old page  | Disposition                                            |
| --------- | ------------------------------------------------------ |
| Dashboard | Removed — Active is the new landing page               |
| Matches   | Merged into Discover (match scores shown on all cards) |
| Bookmarks | Merged into Discover (saved filter)                    |
| Inbox     | Split — notifications → header bell; DMs → Connections |

### Navigation structure

- **Sidebar main (desktop):** Discover, Posts, Connections
- **Bottom tab bar (mobile):** Discover, Posts, Connections
- **Sidebar CTA (desktop):** New Posting button
- **FAB (mobile):** Floating "+" button → New Posting
- **Sidebar secondary:** Profile, Settings
- **Header:** Global search, theme toggle, notifications bell (dropdown), user menu
- **Default landing page:** Posts (empty state nudges to Discover)

## Onboarding Flow

Target: a not-yet-registered user with a written project description can post in **under 30 seconds**.

1. Click "Post project" CTA on landing page
2. OAuth login (Google, GitHub, LinkedIn — one click)
3. Paste project description into free-form field
4. Post

Personal profile configuration is **not required** to create a posting. It can be completed later to improve matching quality. See [vision.md](vision.md) for the product reasoning behind this.

## Page Layouts

### Discover (`/discover`)

Single unified feed replacing the old Postings (Discover tab), Matches, and Bookmarks pages.

- **Search bar** (NL-powered, voice input) at top
- **Sort control:** match score (default), newest, etc.
- **Saved filter:** toggle to show only bookmarked postings
- **Filter panel** (collapsible): category, visibility (public/private), location, team size, time commitment
- **Posting cards** in a flat list — text-first rendering (see [text_first_rewrite.md §6](../.prompts/todo/text_first_rewrite.md)):
  - Creator name + time ago (top, like a message sender)
  - Posting text as primary content (3–4 lines, not truncated to 2)
  - Title is the first line of text (rendered slightly bolder), not a separate field
  - Match score (Discover feed only — hidden in connections/invites/personal contexts)
  - Minimal meta line: only info not already in the text (location, spots open)
  - Skills as feed-level filter pills, not duplicated per card
  - Apply / Express interest action

### Posts (`/posts`)

Merged view replacing the separate My Postings and Active pages. Shows all user-related postings with filter chips.

- **Filter chips** (horizontally scrollable on mobile): All, Created, Joined, Applied, Completed
- Deep-linkable via query parameter: `/posts?filter=created`
- **Created** filter: user's own postings (same as old My Postings page)
- **Joined** filter: active postings where user is an accepted member
- **Applied** filter: postings with pending/waitlisted applications
- **Completed** filter: filled or closed postings
- **New Posting** button visible on desktop only (mobile uses FAB)
- Empty states per filter with contextual CTAs

### My Postings (`/postings`) _(deprecated -- redirects to `/posts?filter=created`)_

Flat list of the user's own postings, sorted by recency. Recruitment-focused.

- **New Posting button** (also in sidebar CTA)
- **Posting cards** showing:
  - Title, status (draft / open / active / closed)
  - Team fill: `current / min (max)` — e.g. `3 / 3 (5)`
  - Pending actions summary: N applicants, sequential invite status
  - Quick entry to Manage view

### Posting Detail (`/postings/[id]`)

Three-tab view for any posting the user owns. Entry point determines default tab (My Postings → Manage, Active → Project).

- **Edit tab:** title, description, category, visibility (public/private toggle), team size, skills, location, settings
- **Manage tab:** applicants list with accept/decline, invite controls (sequential or parallel mode, available on any posting), AI-matched profiles, waitlist
- **Project tab:** group chat, team members, posting details. Disabled (greyed out) until min team size reached.

Tabs that are not yet relevant are shown but disabled.

### Active (`/active`)

List of projects where min team size has been reached — both created and joined.

- **Project cards** showing:
  - Title, team fill `current / min (max)`
  - Unread message count
  - Role: "You created" / "You joined"
  - Time since started
- Clicking opens the posting detail at the **Project tab**
- **Empty state:** nudge to Discover

### Connections (`/connections`)

Chat-like split layout for the user's people network. Replaces Inbox.

- **Left panel:**
  - Search bar
  - **Requests section** (collapsible, at top, auto-hides when empty): pending incoming requests with accept/decline buttons
  - **Connection list:** sorted by last message recency, unread badges
  - **Actions:** + Add (search by name/email), QR Code (show/scan), Share profile link
- **Right panel:** chat with selected connection (1:1 DMs only; project group chat lives in Active)

### Profile (`/profile`)

Text-first profile editor. Mirrors the posting creation paradigm: the primary input is a text field, structure is extracted.

**Page structure:**

1. **Header** — avatar + name + headline. Inline-editable (tap to edit).
2. **Profile editor** — MeshEditor (same as posting creation). The user's bio/description is the primary content. Slash commands available for structured input. Speech input supported.
3. **Extracted metadata** — displayed below the editor as read-only badges/tags. Skills (badges with level), location, languages, interests. These are derived from the profile text via LLM extraction, not inputted through forms. Tapping a badge opens the relevant picker for manual correction.
4. **Availability + Calendar** — the one remaining interactive section. Shows the availability grid/calendar week view, with a "Connect calendar" button inline. Busy blocks from connected calendars overlay on the availability display. This section is always visible (not collapsed) because it's inherently visual and not text-derivable.
5. **Connected accounts** — at the bottom. Shows linked OAuth providers (Google, GitHub, LinkedIn) with connect/disconnect.

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

### Notifications

Not a page — lives in the **header bell icon** as a dropdown.

- Unread count badge on bell
- Dropdown shows recent notifications with type-specific icons
- Mark all as read action
- Notification types: interest_received, application_accepted/rejected, friend_request, sequential_invite (covers both sequential and parallel invites), new_message, match_found

## Interaction Patterns

- **AI compatibility scores** shown on posting cards in Discover feed only (hidden in connections, invites, personal contexts)
- **Real-time messaging** with typing indicators and presence status — 1:1 DMs in Connections, group chat in Active (Project tab)
- **Progressive disclosure:** empty states guide the user to their next action (Active → Discover, Connections → Add)
- **Invite:** invite connections to any posting (not restricted by visibility). Two modes:
  - **Sequential:** rank connections by preference, send invites one-by-one until someone accepts. On decline, the next connection is auto-invited.
  - **Parallel:** invite all selected connections at once. First to accept wins; others are notified the spot is taken.
    Controlled via the Manage tab. **Invitee flow:** notification with inline "Join / Do not join" buttons, plus response card on posting detail.
- **Posting lifecycle:** a posting becomes "active" once min team size is reached. Active postings appear in both My Postings (recruitment lens, while still open) and Active (coordination lens). A posting can be simultaneously open for recruiting and active for coordination.
- **Waitlist**: When a posting is filled, the CTA changes to "Join waitlist" (auto-accept) or "Request to join waitlist" (manual review). Users see their waitlist position. Poster sees waitlisted people in the Manage tab.
- **Invitations** are a persistent posting feature — accessible during posting creation and throughout the posting lifecycle, not just after team formation.
- **Voice input** for posting creation and natural language filtering
- `[planned]` **AI-generated daily digest** notifications

### Text-First Input (v0.3+)

The posting and profile input paradigm is text-first. See [text_first_rewrite.md](../.prompts/todo/text_first_rewrite.md) for the full spec. Key changes:

- **Primary input is a text field**, not a multi-step form. Write what you want, post it, done.
- **Structure is derived, not inputted.** LLM extracts metadata (skills, time, location, category) from text in the background after posting.
- **Posting is instant.** Extraction and matching happen after the posting is live — no gating on LLM processing.
- **Markdown format.** Lightweight markdown (bold, lists, headings, inline code, links). Edit mode shows syntax-highlighted markers (e.g., `**bold**` renders bold but keeps the `**` visible). View mode fully renders.
- **`mesh:` link syntax** for optional precision — `[📍 location](mesh:location?lat=...&lng=...)` embeds structured metadata in the text. Slash commands insert these; plain text is always fine too.
- **`||hidden||` content** — text wrapped in `||` markers is hidden until acceptance. Solves the "send me the details" back-and-forth.
- **`||?||` prompts** — questions wrapped in `||?` markers become interactive form elements on acceptance (LLM converts natural language to UI).
- **Slash commands** as a command palette — content commands (`/time`, `/location`, `/skills`, `/template`, `/hidden`), setting commands (`/visibility`, `/size`, `/autoaccept`), and action commands (`/invite`, `/link`, `/repost`, `/format`, `/clean`). Tab completes, Enter executes. On mobile, accessed via a "/" button that opens a bottom sheet (see [Mobile Command Palette](#mobile-command-palette)).
- **Text tools**: Auto-format (✨) adds markdown structure, Auto-clean (🧹) corrects grammar/spelling. Both apply directly with inline undo.
- **`/update` command** (profile context) — takes an NL instruction as inline argument (e.g., `/update add Python at expert level`) or opens an inline text input. LLM applies changes to the profile text and re-extracts structured fields.
- **Quick chips and post-write nudges**: Deferred — focus on core flow first. Revisit when base editor and commands are polished.

**Profile text-first parity.** The profile uses the same text-first paradigm as postings. The user's bio/description is the single source of truth — skills, location, languages, and interests are extracted from it. Form-based profile fields (fullName, headline, bio form, skills form, interests input, etc.) are deprecated in favor of the unified text editor with slash commands. Availability remains as an explicit interactive section because it is inherently visual.
