# Roadmap

> Milestone tracking, implementation status, and version history. The only place with checkboxes and version numbers.

## Version & Status

- **Current version**: 0.8.0
- **Last updated**: 2026-03-18
- **Versioning**: Milestone-based semver (`MAJOR.MINOR.PATCH`). See [Update Protocol](#update-protocol).

---

## Implemented (v0.1 → v0.4)

### Core Platform (v0.1)

- [x] Auth flow (sign-up, login, logout, session management)
- [x] Onboarding (text + voice input with AI extraction)
- [x] Profile CRUD with free-form AI extraction and undo
- [x] Dashboard with posting overview
- [x] Posting CRUD (category, tags, mode, skill level, context identifier, description)
- [x] Browse/discover page with search
- [x] Embedding-based matching algorithm with relevance scoring
- [x] Real-time messaging (inbox) via Supabase channels
- [x] Settings page
- [x] Data model: `postings` table with full schema

### Redesign Phase 2 — Features & Polish (v0.1 → v0.2)

- [x] Voice input integration — SpeechInput in onboarding, posting creation, and browse search
- [x] Posting expiration display + reactivation (Repost + Extend Deadline buttons)
- [x] Advanced filters on browse page (category, mode toggles)
- [x] Deprecated `/messages` page removed (links updated to `/inbox`)
- [x] Terminology migration — all UI labels updated per spec (`e922daa`)
- [x] Context identifier input on posting creation form (`a1e07be`)
- [x] Auto-accept setting with dynamic Join/Request to join CTA (`73d0c12`)
- [x] Free-form posting Quick Update via AI (`c3b8bca`)

### Infrastructure & DX

- [x] SWR migration for data fetching (#21)
- [x] Auth route protection via `proxy.ts` (#18)
- [x] Batch embedding generation (#17)
- [x] Natural language filter translation (#15)
- [x] Gemini model fallback (`8216f8b`)
- [x] Test/staging dual-Supabase environment (#30)
- [x] CI pipeline: lint, typecheck, unit tests, E2E tests, build (#32–36)
- [x] Pre-commit hooks (Prettier + ESLint via lint-staged)

### Skills System (v0.2)

- [x] `skill_nodes` table with seed taxonomy (~150+ nodes, 12 root categories)
- [x] `profile_skills` and `posting_skills` join tables with per-skill levels
- [x] LLM auto-adding pipeline (`/api/skills/normalize`) — Gemini-powered normalization with alias matching
- [x] Skill search and browse APIs (`/api/skills/search`, `/api/skills/children`)
- [x] Skill picker UI — typeahead search, hierarchical tree browsing, custom skill addition
- [x] Profile and posting form integration with per-skill level sliders
- [x] Code reads from join tables with fallback to old columns (expand phase complete, `1a5e42b`)

### Waitlist (v0.2)

- [x] `waitlisted` application status with auto-waitlist when posting filled
- [x] FIFO promotion logic (auto-promote on auto-accept postings, notify on manual-review)
- [x] Waitlist position display ("You are #N on the waitlist")
- [x] Edge cases: withdrawal triggers promotion, repost clears waitlist, unique constraint prevents duplicates

### Engagement (v0.2)

- [x] Bookmarks page (`/bookmarks`) with sidebar nav item
- [x] In-app notification system (table, preferences, types, real-time display)

### Sequential Invite (v0.2)

- [x] Owner-side create/manage invite card with connection selector and progress timeline
- [x] Invitee-side response card with inline Join / Do not join buttons
- [x] Notification handling (`sequential_invite` type for invite, accept, decline)
- [x] Auto-invite next connection on decline
- [x] Terminology migration: `friend_ask` → sequential invite (`c0a0c96`)

### Invite Redesign (v0.2)

- [x] `mode` → `visibility` rename (expand-contract migration; `visibility: public | private`)
- [x] Fix "coerce to single JSON" bug in respond route (`.single()` → `.maybeSingle()` + RLS fix)
- [x] Decouple invites from visibility — invite card always available on Manage tab
- [x] Parallel invite mode (first-to-accept wins)
- [x] AI extraction of invitee names from free-form text
- [x] Prominent visibility toggle (segmented control with Globe/Lock icons)
- [x] Updated labels and UX (invite → sequential/parallel sub-modes)

### Navigation & Connections (v0.2)

- [x] Project group chat — group messaging per posting (Project tab), distinct from 1:1 DMs
- [x] Connections page — split layout: connection list with DMs, pending requests, add/QR/share
- [x] Connection improvements — QR code, share profile link, connect button, search by name/email
- [x] Availability input & matching — minute-level windows, quick/detailed mode, overlap scoring. Phases 1–2 of [availability-calendar spec](1-availability.md)

### Text-First Posting & Navigation (v0.3)

- [x] Text-first posting creation — single text field + "Post" button, instant publish, background LLM extraction
- [x] Extracted metadata review — post-publish card for reviewing/correcting extracted fields
- [x] Markdown rendering (view mode) — posting/profile text rendered as markdown (#28)
- [x] Discover page — single feed sorted by match score with saved filter
- [x] My Postings page — flat list of own postings with team fill and pending actions
- [x] Posting detail tabs — Edit / Manage / Project tabs with disabled states
- [x] Active page — active projects with unread messages, role, team fill
- [x] Notifications → header bell — bell dropdown, removed `/inbox` route
- [x] Sidebar & routing update — new nav items, default landing → Active
- [x] Remove Dashboard page — removed `/dashboard` route and components

### Smart Input & Profile (v0.4)

- [x] Slash commands — `/time`, `/location`, `/skills`, `/template` with popup menu and overlay pickers
- [x] Quick chips — context-sensitive suggestion chips below text field (rule-based, 4 dimensions)
- [x] Post-write nudges — LLM suggests missing dimensions after writing (non-blocking, dismissible)
- [x] Auto-format / auto-clean — text tools with direct edit and inline undo
- [x] Profile text-first — paste-and-go onboarding + guided prompts for new users + extraction review
- [x] Mobile keyboard toolbar — quick-access buttons for `/`, `#`, `**`, `-`, `` ` `` above keyboard
- [x] Skill gap filling — prompt to describe skills when viewing postings requiring skills not in profile

### Deep Matching (v0.5)

- [x] LLM deep match (Stage 2) — LLM evaluates top ~10–20 fast-filter candidates using full posting + profile text
- [x] Multi-role matching — LLM identifies distinct roles in a posting, matches candidates per role separately
- [x] Match explanations (premium) — human-readable explanation of match quality (tier-gated, cached)
- [x] Hard filter enforcement — two-stage: hard filters (context, category, skill, location, availability) then soft scoring
- [x] Tree-aware skill filtering — parent skill selection includes all descendants via recursive CTE (`get_skill_descendants`)
- [x] Per-skill matching scoring — per-skill level comparison from `posting_skills` join table (replaces averaged `skill_level_min`)
- [x] Drop old skill columns — removed `skills text[]`, `skill_levels jsonb`, `skill_level_min integer` (`20260218155203`)
- [x] Max distance matching (#31) — location distance as a matching dimension (haversine, normalized by 5000 km)

### Engagement & Polish (v0.5)

- [x] Template library (DB-backed) — persistent template storage (DB table + CRUD API)
- [x] N-sequential invites — generalized invite flow: maintain N outstanding invitations with backfill
- [x] Post-accept info reveal — hidden details auto-revealed on acceptance
- [x] Slash command overlays — upgraded /skills (SkillPicker) and /location (LocationAutocomplete) overlays
- [x] Text tools direct edit — auto-format/clean applies directly with inline undo
- [x] PWA auto-update — safe runtime caching, automatic SW update + reload, iOS visibilitychange fix

---

## Milestones

> **Direction**: [1-text-first.md](1-text-first.md) defines the text-first philosophy; [1-spaces.md](1-spaces.md) defines the Spaces model that replaces the posting-centric architecture. Milestones v0.7+ are organized around the Spaces rewrite. Where this roadmap and the behavior specs conflict, the specs take precedence.

### v0.6 — Text-First Rendering & Syntax

The editor and rendering system adopt the new markdown syntax (`mesh:` links, `||hidden||`, `||?||`) and the text-first card rendering philosophy. See [1-text-first.md](1-text-first.md) §3a, §3b, §6. Some items (e.g., `mesh:` syntax, `||hidden||`) may be folded into v0.7 Spaces Phase 1.

| Feature                        | Issue | Effort | Description                                                                                                                                                                                                                                     |
| ------------------------------ | ----- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unified PostingCard            | —     | Medium | Consolidate PostingCard, PostingDiscoverCard, PostsCard into one component with `full`/`compact` variants. Text is the hero element.                                                                                                            |
| Title as first line            | —     | Small  | Remove separate title field. First line/sentence renders as heading. Auto-extracted title becomes display-only.                                                                                                                                 |
| Match score: Discover only     | —     | Small  | Hide match score badges outside of Discover feed. Score still drives ranking.                                                                                                                                                                   |
| `mesh:` link syntax (editor)   | —     | Medium | CodeMirror decorations for `[📍 text](mesh:location?...)` — render as styled tappable chips, hide URL in edit mode.                                                                                                                             |
| `mesh:` link syntax (view)     | —     | Small  | MarkdownRenderer strips `mesh:` URLs, renders display text with emoji. Location links may show map widget.                                                                                                                                      |
| Slash commands emit `mesh:`    | —     | Small  | `/time`, `/location`, `/skills` overlays emit `mesh:` link syntax instead of emoji+text. Remove `chipMetadata` sidecar.                                                                                                                         |
| `\|\|hidden\|\|` syntax        | —     | Medium | Editor: dimmed + lock icon. View: placeholder for non-accepted, revealed for accepted. Parser for inline and block forms.                                                                                                                       |
| `/hidden` command              | —     | Small  | Inserts `\|\|...\|\|` block with cursor inside. Added to slash command registry.                                                                                                                                                                |
| Discover filter by connections | —     | Small  | Toggle in Discover feed to show only postings from connections. Simple query filter + UI toggle.                                                                                                                                                |
| Remove chips & nudges remnants | —     | Small  | Clean up any remaining quick chip / post-write nudge code (deliberately removed, now spec-deferred).                                                                                                                                            |
| Text-first profile redesign    | —     | Large  | Replace form-based profile with unified MeshEditor. Skills/location/interests extracted from text. Slash commands for profile context (`/skills`, `/location`, `/availability`, `/calendar`, `/update`). No view/edit toggle — always editable. |
| Profile calendar promotion     | —     | Medium | Move calendar connect UX from Settings into Profile's availability section. Busy blocks overlay inline. Calendar visibility settings accessible from profile.                                                                                   |
| Settings page slimming         | —     | Small  | Remove calendar from Settings. Move sign out to regular action (not danger zone). Danger zone = delete account only.                                                                                                                            |
| Mobile command bottom sheet    | —     | Medium | "/" button near editor opens bottom sheet with command list on mobile. Replace cursor-position dropdown. Fix touch handling (`onPointerDown`).                                                                                                  |
| `/update` command              | —     | Medium | NL instruction command for profile context. Takes inline argument or opens inline text input. LLM applies changes to profile text + re-extracts structured fields.                                                                              |

### v0.7 — Spaces Phase 1: Structural Rewrite

The core model change. After Phase 1, the app is a messenger with Spaces, posting-messages, and the existing matching/invite machinery. Subsumes the old v0.7 (Command Palette) — useful items folded in or deferred to backlog. See [1-spaces.md](1-spaces.md) and [designs/spaces-rewrite.md](designs/spaces-rewrite.md) §16.

#### Done

| Feature                       | Description                                                                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| New DB tables                 | `spaces`, `space_members`, `space_messages`, `space_postings`, `space_join_requests`, `space_invites`, `activity_cards`. RLS, triggers, FTS indexes. |
| 3-tab navigation              | Spaces / Activity / Profile bottom bar (mobile) + sidebar (desktop).                                                                                 |
| Space list UI                 | Filters (All/DMs/Groups/Public/Pinned), search, pins, unread badges, last-message previews, realtime updates.                                        |
| Space view                    | Conversation timeline with posting-cards inline, auto-scroll, load-more.                                                                             |
| Compose area                  | Message/Posting toggle, inline posting fields (category, capacity, deadline, tags, visibility, auto-accept).                                         |
| Posting-messages              | Create postings within Spaces, auto sub-Space generation, posting browser for large Spaces.                                                          |
| Join requests                 | Submit, accept, reject, waitlist. Auto-accept. Activity card on request.                                                                             |
| Invite batches                | Sequential/parallel modes, ordered list, pending/declined tracking. Activity cards for invitees.                                                     |
| Activity tab                  | Personal cards (match, invite, join_request, scheduling, rsvp, connection_request) with realtime subscription.                                       |
| State text                    | Collapsible banner, admin-editable. `/summarize` not yet wired.                                                                                      |
| Read tracking                 | DB trigger increments `unread_count`. Auto mark-as-read on fetch.                                                                                    |
| Realtime messaging            | Supabase Realtime per-Space channels. Optimistic updates.                                                                                            |
| Presence & typing indicators  | Typing indicators hook (`use-space-presence`) wired to compose area.                                                                                 |
| Activity card side-effects    | `actOnCard` dispatches real actions: accept/reject join requests, accept/decline invites, navigate to matches.                                       |
| Invite response API           | Endpoint for invitees to accept/decline invites. Advances sequential invites on decline.                                                             |
| Global Space + DM seeding     | Migration creates Global Space row and DM Spaces for existing connections.                                                                           |
| Posting-only mode enforcement | Compose area checks `settings.posting_only` and locks toggle to posting mode.                                                                        |
| Member management UI          | Admin controls in space-info-sheet: remove members, change roles. Last-admin guard.                                                                  |
| Posting lifecycle UI          | Status transitions (close/fill), edit dialog, delete with confirmation.                                                                              |
| Realtime postings             | Realtime subscription in `use-space-postings` via `subscribeToSpacePostings`.                                                                        |
| Sub-Space thread rendering    | Reply counts via RPC, "View Thread" link on posting cards, back navigation to parent.                                                                |
| DM Space creation flow        | Auto-create 2-person Space on connection accept. Idempotent with duplicate detection.                                                                |
| `visible_from` enforcement    | RLS policy `space_messages_select` filters messages by member `visible_from` timestamp.                                                              |
| Matching → Spaces integration | Embedding pipeline wired for `space_postings`. Matching triggered after embedding. Activity cards include space navigation.                          |
| Space search (FTS)            | `search_space_messages` RPC with security invoker, API endpoint, search UI in space header.                                                          |

#### Remaining

| Feature                             | Effort | Description                                                                                                                                                                    |
| ----------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inherited → independent transition  | Small  | Auto-set `inherits_members = false` when outsider joins via matching/invite.                                                                                                   |
| Old table cleanup                   | Medium | Drop migration for old `postings`, `conversations`, `messages`, `group_messages`.                                                                                              |
| Conversation summary as LLM context | Small  | Pass last ~5 messages from the Space conversation to extraction and deep-match LLM calls so the LLM understands conversational context (e.g. "same as last week but Tuesday"). |
| Space context in explanations/cards | Small  | Propagate parent Space `state_text` to match explanation generation and acceptance card LLM calls (currently only deep match receives it).                                     |

### v0.8 — Spaces Phase 2: Rich Interactive Cards

Built on Phase 1. The card system that replaces back-and-forth coordination. Subsumes the old v0.8 (Smart Acceptance & Calendar) — acceptance flow is now a card type. See [designs/spaces-rewrite.md](designs/spaces-rewrite.md) §16.

#### Done

| Feature                   | Description                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `space_cards` table       | Card state tracking (active, resolved, cancelled). `vote_on_card` RPC for atomic voting.                                       |
| Card types                | Time proposal, RSVP, poll, task claim, location. All 5 types with creation dialogs and rendering.                              |
| Card rendering            | Interactive cards in conversation timeline with live vote updates via Supabase Realtime.                                       |
| Card actions              | Vote, change vote, cancel, resolve. Per-card controls for creator/admin.                                                       |
| Card creation dialogs     | RSVP (title + threshold), Task Claim (description), Location (place name). Fixed options per spec.                             |
| Auto-resolve on consensus | Time proposals: all members voted + clear winner. RSVP: Yes votes >= threshold. Task claim: first claimer.                     |
| Calendar event creation   | Resolved time proposals create Google Calendar events for connected participants (fire-and-forget, best-effort).               |
| LLM card suggestion       | After sending a message, LLM detects coordination intent and offers suggestion chip. Accept prefills the right dialog.         |
| Space archiving UI        | Archive/unarchive in space-info-sheet (admin). Archived section in space list with filter chip. Manual only (no auto-archive). |
| Cross-Space promotion UI  | "Promote to Explore" button on posting controls. Creates linked posting-message in Global Space.                               |

#### Remaining

| Feature                    | Effort | Description                                                                     |
| -------------------------- | ------ | ------------------------------------------------------------------------------- |
| Trade-off card type        | Medium | "No perfect option — pick one" card with creator selection                      |
| Card invalidation Phase 2a | Medium | Explicit actions only — buttons on cards (supersede, update)                    |
| Card invalidation Phase 2b | Large  | Free-text detection — LLM reads messages against active cards, suggests updates |
| Auto-archive (30-day)      | Small  | Cron-based auto-archive after 30 days of no messages                            |

### v0.8.5 — Intelligent Prefill & Scheduling Intelligence

Calendar-aware card suggestions, smart prefill, chained flows, and coordination norms. Implements the Card Principles ([1-spaces.md](1-spaces.md) §7) and Intelligent Coordination Flows ([0-use-cases.md](0-use-cases.md) §"Intelligent Coordination Flows"). Full design: [designs/intelligent-prefill.md](designs/intelligent-prefill.md).

#### Phase A: Calendar-Aware Time Proposals

The core differentiator — "dinner friday?" → pre-filled time slots from N-way calendar overlap + scheduling preferences.

| Feature                         | Effort | Description                                                                                                                                                                                                                                             |
| ------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fused detect-and-suggest LLM    | Medium | Replace separate detect + suggest with single Flash Lite call. Receives messages + calendar overlap + `\|\|hidden\|\|` profiles. Returns card type + prefilled data + member notes in one response. New `card-suggest.ts` replaces `card-detection.ts`. |
| Suggest API calendar enrichment | Medium | Before LLM call: fetch member profiles (availability, timezone, source_text), calendar busy blocks, compute N-way overlap via `windowsToConcreteDates()`, extract `\|\|hidden\|\|` text via `parseHiddenBlocks()`.                                      |
| Structured slot format          | Small  | Time proposal slots store `{label, start, end}` (not just string labels). Calendar integration reads structured dates instead of parsing label text. Backward-compatible.                                                                               |
| Duration inference              | Small  | LLM infers activity duration from message context (coffee → 30 min, dinner → 2h). Stored in card data. Calendar events use actual duration instead of hardcoded 1h.                                                                                     |
| RSVP threshold intelligence     | Small  | Default threshold = `ceil(memberCount × 0.6)` instead of hardcoded 2.                                                                                                                                                                                   |
| Specific-time detection         | Small  | "Let's meet at 2" + all members free → RSVP (not time proposal). Conflicts → time proposal with specific time + alternatives. See Flow 2 in [0-use-cases.md](0-use-cases.md).                                                                           |

#### Phase B: Suggestion UX

One-tap quick-send, calendar context, deadlines on all cards.

| Feature                       | Effort | Description                                                                                                                                                                                                                                      |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Two-path suggestion chip      | Medium | Primary: quick-send (1 tap, creates card with prefill). Secondary: edit (opens dialog). Chip shows preview: "📅 Fri 19:00 · 19:30 · 20:00". See Intelligent Pre-fill principle in [1-spaces.md](1-spaces.md) §7.                                 |
| Calendar context strip        | Medium | Compact horizontal day view on time proposal cards showing surrounding events for the current user. Per-user rendering from cached `calendar_busy_blocks`. See Flow 2 in [0-use-cases.md](0-use-cases.md).                                       |
| Card deadlines                | Medium | Migration: add `deadline timestamptz` to `space_cards`. Defaults: time_proposal 12h, RSVP 24h, poll 24h. Display: "Closes in 8h". Auto-resolve on-read when deadline passed. See Deadline Resolution principle in [1-spaces.md](1-spaces.md) §7. |
| Detection prompt improvements | Small  | Disambiguate task_claim vs. poll ("who wants X?" vs. "what should we X?"), declarative RSVP vs. negotiation. Part of fused LLM prompt. See Flow 3 in [0-use-cases.md](0-use-cases.md).                                                           |

#### Phase C: Chained & Reactive Flows

Card events trigger follow-up suggestions; declines offer alternatives to both parties.

| Feature                  | Effort | Description                                                                                                                                                                                                                           |
| ------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decline-and-suggest      | Medium | RSVP "No" vote triggers alternative time suggestions to BOTH the voter and card creator via Realtime. See Decline-and-Suggest principle in [1-spaces.md](1-spaces.md) §7 and Flow 2 in [0-use-cases.md](0-use-cases.md).              |
| Chained card flow        | Medium | Card resolution triggers follow-up: time resolved → suggest location, poll resolved → suggest time proposal. Pushed via Realtime `card_suggestion` event. See Chained Card Flow principle in [1-spaces.md](1-spaces.md) §7.           |
| Private constraint notes | Small  | Per-member notes on time proposal cards ("Your meeting ends at 18:30, ~30 min buffer"). Generated by fused LLM, stored in card `data.member_notes`. See Private Constraints principle and Flow 1 in [0-use-cases.md](0-use-cases.md). |

#### Phase D: Hidden Profile Integration

`||hidden||` in profile text for scheduling preferences — the data source for Phases A–C.

| Feature                            | Effort | Description                                                                                              |
| ---------------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| Profile `\|\|hidden\|\|` rendering | Medium | CodeMirror decoration: dimmed style + lock icon for `\|\|...\|\|` blocks in profile editor.              |
| `/hidden` slash command            | Small  | Wraps selected text in `\|\|...\|\|` or inserts empty block. Added to profile slash command registry.    |
| Scheduling preferences onboarding  | Small  | Profile setup prompt: "Anything we should know when scheduling?" Auto-wraps in `\|\|...\|\|`. Skippable. |

#### Phase ordering

Phase A first (highest impact, most infra exists). Phase B in parallel where possible. Phase D can start early (independent). Phase C last (needs A+B working). See [designs/intelligent-prefill.md](designs/intelligent-prefill.md) §3 for dependency diagram.

### v0.9 — Mobile (Capacitor, Android)

Minimal native Android shell wrapping the hosted web app. iOS deferred — PWA covers iOS users.

**Approach:** Hosted URL mode — the Capacitor WebView loads `https://meshit.app`. See [mobile_support_capacitor.md](../.prompts/mobile_support_capacitor.md) for UX considerations.

| Feature                          | Issue | Effort | Description                                                                                       |
| -------------------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------- |
| Capacitor init + Android project | —     | Small  | `npx cap init`, add `android/` project, `capacitor.config.ts` pointing at hosted URL              |
| Splash screen + status bar       | —     | Small  | Native splash screen, status bar theming (`@capacitor/splash-screen`, `@capacitor/status-bar`)    |
| Android back button + deep links | —     | Small  | Hardware back nav + universal links (`@capacitor/app`)                                            |
| App icons + store listing        | —     | Small  | Icon sizes, screenshots, Play Store metadata, keystore, `gradlew bundleRelease`                   |
| Platform detection utility       | —     | Small  | `Capacitor.isNativePlatform()` helper — suppress PWA install prompt in native shell               |
| Android push notifications (FCM) | —     | Medium | Firebase Cloud Messaging via `@capacitor/push-notifications`. Replaces web push in native context |

### v1.0 — Launch

| Feature               | Issue | Effort | Description                                                                          |
| --------------------- | ----- | ------ | ------------------------------------------------------------------------------------ |
| Email + push notifs   | #14   | Large  | Email and push delivery channels (in-app already implemented)                        |
| Match pre-computation | #13   | Large  | Background pre-computation for instant match results at scale                        |
| LLM cost tiering      | —     | Medium | Tier models by feature: cheap for format, mid for extraction, high for deep matching |
| Production hardening  | —     | Large  | Performance audit, error monitoring, rate limiting, security review                  |

### v1.1 — Post-Launch

| Feature                      | Issue | Effort       | Description                                                                                                             |
| ---------------------------- | ----- | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Posting images               | #29   | Medium       | Upload and display images on postings (Supabase Storage)                                                                |
| Ghost text (LLM suggestions) | —     | Medium       | Context-aware inline suggestions as user types, including prefilled slash commands                                      |
| Auto-translation             | —     | Medium-Large | Posts auto-translated based on user language settings                                                                   |
| Recurring postings           | —     | Medium       | `/recur weekly tue` — auto-create posting-message instances on schedule within a Space. See [1-spaces.md](1-spaces.md). |
| Daily digest                 | —     | Medium       | Cron-based email digest of new relevant postings (Resend)                                                               |

---

## Explorations

Design areas that need deeper thinking before they become milestones. See `designs/` for detailed notes.

- **Spaces rewrite** — replaces the posting-centric model with a messenger-like interface where the fundamental unit is the Space. Full design in `designs/spaces-rewrite.md`. Phases 1 and 2 are now milestones v0.7 and v0.8.
- **Continuous profile building & failure-driven context capture** — profiles grow from usage (postings, acceptances, rejections) rather than upfront forms. Coordination failures (no matches, cancelled invites, exhausted sequences) become prompts for adding constraints or profile context. See `designs/continuous-profile-and-failure-recovery.md`.

---

## Backlog (Unprioritized)

These are ideas without a target milestone. They'll be prioritized as the product evolves:

- Auto-location detection (#16) — detect user location from IP for matching defaults
- Real-time voice upgrade — streaming voice input (OpenAI Realtime, Gemini Live)
- Auto-generated thumbnails — generate posting thumbnails from text via Gemini
- Analytics dashboard for posting owners
- iOS Capacitor build — Apple Developer account, Xcode signing, App Store listing (deferred; PWA covers iOS)
- Standardize date formatting across the app (#44)
- Add skeleton/spinner loading states for slow connections (#48)
- Configurable matching weights — weight sliders per posting (revisit after deep matching)
- Quick chips (deferred) — context-sensitive suggestion chips below text field. Revisit when core flow is polished.
- Post-write nudges (deferred) — LLM suggests missing dimensions. Revisit when core flow is polished.
- Email auth fix (SMTP) (#37) — configure Supabase SMTP for confirmation emails
- Centralize API endpoint paths — ~21 files still use raw `fetch("/api/...")` strings instead of going through a shared constants module (like SWR cache keys). Consolidate to prevent drift when API routes are renamed.

---

## Update Protocol

### Versioning Scheme

- **Semver**: `MAJOR.MINOR.PATCH` (currently `0.x.y`, pre-launch)
- **Minor bump** (`0.x.0`): when a milestone's features are complete and merged to `main`
- **Patch bump** (`0.x.y`): bug fixes and small improvements merged to `main`
- **Major bump** (`1.0.0`): public launch
- **Where tracked**: `package.json` version field + git tags (`v0.2.0`)
- **When to tag**: on merge to `main` that completes a milestone

### Keeping This File Current

1. **Feature PRs**: when your PR implements or completes a roadmap item, update this file:
   - Mark the item `[x]` and move it to "Implemented"
   - If it was the last item in a milestone, bump the version in `package.json`
2. **New issues**: when opening a GitHub issue for a planned feature, add the issue number to the relevant milestone row
3. **CI enforcement**: a warning is emitted on `feat/` PRs that don't touch this file (non-blocking)
4. **Quarterly review**: revisit milestone assignments and priorities at least once per quarter
