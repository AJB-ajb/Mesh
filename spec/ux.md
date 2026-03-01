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

| Page                   | Route                   | Description                                                                            |
| ---------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| Landing                | `/`                     | Hero, features, CTA                                                                    |
| Login                  | `/login`                | Email/password + OAuth (Google, GitHub, LinkedIn)                                      |
| Sign up                | `/signup`               | Registration                                                                           |
| Forgot password        | `/forgot-password`      | Recovery email                                                                         |
| Reset password         | `/reset-password`       | Reset form                                                                             |
| Onboarding             | `/onboarding`           | Persona selection (developer / posting creator)                                        |
| Onboarding — profile   | `/onboarding/developer` | Voice/text profile setup                                                               |
| Discover               | `/discover`             | Single feed of all postings, sorted by match score, with saved filter                  |
| Posts                  | `/posts`                | Merged view: user's created, joined, applied, and completed postings with filter chips |
| Create posting         | `/postings/new`         | Free-form input + AI extraction                                                        |
| Posting detail         | `/postings/[id]`        | Tabbed view: Edit · Manage · Project                                                   |
| Connections            | `/connections`          | Connections list with DMs, requests, add/QR                                            |
| My Postings (redirect) | `/my-postings`          | Redirects to `/posts?filter=created`                                                   |
| Active (redirect)      | `/active`               | Redirects to `/posts?filter=joined`                                                    |
| Profile                | `/profile`              | User profile                                                                           |
| Settings               | `/settings`             | User settings                                                                          |

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
- **Posting cards** in a flat list, each showing:
  - Title, description snippet
  - Match score percentage
  - Category badge, team size, location
  - Bookmark star (toggle)
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

### Notifications

Not a page — lives in the **header bell icon** as a dropdown.

- Unread count badge on bell
- Dropdown shows recent notifications with type-specific icons
- Mark all as read action
- Notification types: interest_received, application_accepted/rejected, friend_request, sequential_invite (covers both sequential and parallel invites), new_message, match_found

## Interaction Patterns

- **AI compatibility scores** shown on posting cards across Discover feed (match score on every card)
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

The posting and profile input paradigm is shifting from form-first to text-first. See [text_first_rewrite.md](../.prompts/text_first_rewrite.md) for the full spec. Key changes:

- **Primary input is a text field**, not a multi-step form. Write what you want, post it, done.
- **Structure is derived, not inputted.** LLM extracts metadata (skills, time, location, category) from text in the background after posting.
- **Posting is instant.** Extraction and matching happen after the posting is live — no gating on LLM processing.
- **Markdown format.** Postings and profiles are lightweight markdown (bold, lists, headings, inline code, links). Rendered inline while editing, fully rendered when viewing.
- **Slash commands** (`/time`, `/location`, `/skills`, `/template`) for optional precision — content commands produce text, action commands set metadata.
- **Quick chips** below the text field for context-sensitive suggestions on mobile.
- **Text tools**: Auto-format (✨) adds markdown structure, Auto-clean (🧹) corrects grammar/spelling. Both show diffs for approval.
- **Post-write nudges**: LLM suggests missing dimensions (e.g., "You haven't mentioned **when**"), non-blocking.
