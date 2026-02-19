# UX Spec

## Design Principles

1. **Minimal friction** — no required configuration, one-click OAuth, 30-second onboarding (see below)
2. **Fast, simple, efficient usage**
   - **Keyboard-first:** forms are navigable and completable via keyboard (Tab, Enter, shortcuts)
   - **Free-form first:** the default input is a single free-form text or voice field; reference fields and guiding questions are shown alongside as a helpful scaffold, but not required
3. **Idea-first** — start from what you want to do, not from building a profile
4. **Natural language interface** — voice and text input, AI extracts structured data
5. **Good enough matching** — cover common cases well; better than random, not perfect
6. **High responsiveness** — postings should feel fresh and active; instant notifications for time-critical items

## Pages & Navigation

### Routes

| Page                 | Route                   | Description                                                           |
| -------------------- | ----------------------- | --------------------------------------------------------------------- |
| Landing              | `/`                     | Hero, features, CTA                                                   |
| Login                | `/login`                | Email/password + OAuth (Google, GitHub, LinkedIn)                     |
| Sign up              | `/signup`               | Registration                                                          |
| Forgot password      | `/forgot-password`      | Recovery email                                                        |
| Reset password       | `/reset-password`       | Reset form                                                            |
| Onboarding           | `/onboarding`           | Persona selection (developer / posting creator)                       |
| Onboarding — profile | `/onboarding/developer` | Voice/text profile setup                                              |
| Discover             | `/discover`             | Single feed of all postings, sorted by match score, with saved filter |
| My Postings          | `/postings`             | Flat list of user's own postings (recruitment lens)                   |
| Create posting       | `/postings/new`         | Free-form input + AI extraction                                       |
| Posting detail       | `/postings/[id]`        | Tabbed view: Edit · Manage · Project                                  |
| Active               | `/active`               | Active projects (min team reached) — coordination lens                |
| Connections          | `/connections`          | Connections list with DMs, requests, add/QR                           |
| Profile              | `/profile`              | User profile                                                          |
| Settings             | `/settings`             | User settings                                                         |

### Removed pages

| Old page  | Disposition                                            |
| --------- | ------------------------------------------------------ |
| Dashboard | Removed — Active is the new landing page               |
| Matches   | Merged into Discover (match scores shown on all cards) |
| Bookmarks | Merged into Discover (saved filter)                    |
| Inbox     | Split — notifications → header bell; DMs → Connections |

### Navigation structure

- **Sidebar main:** Discover, My Postings, Active, Connections
- **Sidebar secondary:** Profile, Settings
- **Sidebar CTA:** New Posting button
- **Header:** Global search, theme toggle, notifications bell (dropdown), user menu
- **Default landing page:** Active (empty state nudges to Discover)

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
- **Filter panel** (collapsible): category, mode, location, team size, time commitment
- **Posting cards** in a flat list, each showing:
  - Title, description snippet
  - Match score percentage
  - Category badge, team size, location
  - Bookmark star (toggle)
  - Apply / Express interest action

### My Postings (`/postings`)

Flat list of the user's own postings, sorted by recency. Recruitment-focused.

- **New Posting button** (also in sidebar CTA)
- **Posting cards** showing:
  - Title, status (draft / open / active / closed)
  - Team fill: `current / min (max)` — e.g. `3 / 3 (5)`
  - Pending actions summary: N applicants, sequential invite status
  - Quick entry to Manage view

### Posting Detail (`/postings/[id]`)

Three-tab view for any posting the user owns. Entry point determines default tab (My Postings → Manage, Active → Project).

- **Edit tab:** title, description, category, mode, team size, skills, location, settings
- **Manage tab:** applicants list with accept/decline, sequential invite controls (create new invites to connections at any time), AI-matched profiles, waitlist
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
- Notification types: interest_received, application_accepted/rejected, friend_request, sequential_invite, new_message, match_found

## Interaction Patterns

- **AI compatibility scores** shown on posting cards across Discover feed (match score on every card)
- **Real-time messaging** with typing indicators and presence status — 1:1 DMs in Connections, group chat in Active (Project tab)
- **Progressive disclosure:** empty states guide the user to their next action (Active → Discover, Connections → Add)
- **Sequential Invite:** ordered invite flow — rank connections by preference, send invites one-by-one until someone accepts. Controlled at the posting level via the Manage tab (not global settings). New sequential invites can be created at any point while a posting is open. **Invitee flow:** notification with inline "Join / Do not join" buttons, plus response card on posting detail. On decline, the next connection is auto-invited.
- **Posting lifecycle:** a posting becomes "active" once min team size is reached. Active postings appear in both My Postings (recruitment lens, while still open) and Active (coordination lens). A posting can be simultaneously open for recruiting and active for coordination.
- **Waitlist**: When a posting is filled, the CTA changes to "Join waitlist" (auto-accept) or "Request to join waitlist" (manual review). Users see their waitlist position. Poster sees waitlisted people in the Manage tab.
- **Voice input** for posting creation and natural language filtering
- `[planned]` **AI-generated daily digest** notifications
- `[planned]` **Markdown-first interface**: Markdown input/output for postings, conversations, and configuration. Copy posting as markdown. Auto-clean/format options. Handoff document export (full context including platform metadata).
