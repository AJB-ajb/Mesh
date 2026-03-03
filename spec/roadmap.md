# Roadmap

## Version & Status

- **Current version**: 0.5.0
- **Last updated**: 2026-03-01
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
- [x] Availability input & matching — minute-level windows, quick/detailed mode, overlap scoring. Phases 1–2 of [availability-calendar spec](availability-calendar.md)

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

> **Direction**: The text-first rewrite ([text_first_rewrite.md](../.prompts/text_first_rewrite.md)) is the primary driver for v0.5+. Milestones are organized around its phases. Where this roadmap and the text-first spec conflict, the text-first spec takes precedence.

### v0.6 — Rich Editing & Polish

| Feature                    | Issue | Effort           | Description                                                                                                    |
| -------------------------- | ----- | ---------------- | -------------------------------------------------------------------------------------------------------------- |
| Email + push notifications | #14   | Large            | Email and push delivery (in-app already implemented)                                                           |
| Daily digest               | —     | Medium           | Cron-based email digest of new relevant postings (Resend)                                                      |
| ~~Markdown edit mode~~     | —     | ~~Medium-Large~~ | ✅ Tiptap-based inline markdown editor (`MeshEditor`). Shared component for postings and profile bio           |
| ~~Metadata-linked chips~~  | —     | ~~Medium~~       | ✅ Inline chips for location, time, skills via slash commands. Structured data stored as `chip_metadata` jsonb |
| Auto-translation           | —     | Medium-Large     | Posts auto-translated based on user language settings. Communication language as matching criterion            |
| Template library           | —     | Medium           | Pre-built templates for common posting types, accessible via `/template`                                       |
| Posting images             | #29   | Medium           | Upload and display images on postings                                                                          |
| Email auth fix (SMTP)      | #37   | Small            | Configure Supabase SMTP for confirmation emails                                                                |

### v0.7 — Mobile (Capacitor, Android)

Minimal native Android shell wrapping the hosted web app. iOS deferred — PWA covers iOS users. No native push initially; PWA web push serves as the notification channel.

**Approach:** Hosted URL mode — the Capacitor WebView loads `https://meshit.app`. Web deploys update the app instantly without Play Store review. Native builds only needed for plugin/shell changes. See [mobile_support_capacitor.md](../.prompts/mobile_support_capacitor.md) for UX considerations.

| Feature                          | Issue | Effort | Description                                                                                       |
| -------------------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------- |
| Capacitor init + Android project | —     | Small  | `npx cap init`, add `android/` project, `capacitor.config.ts` pointing at hosted URL              |
| Splash screen                    | —     | Small  | Native splash screen while WebView loads (`@capacitor/splash-screen`)                             |
| Status bar theming               | —     | Small  | Match status bar to dark theme (`@capacitor/status-bar`)                                          |
| Android back button              | —     | Small  | Handle hardware back button navigation (`@capacitor/app`)                                         |
| App icons + store assets         | —     | Small  | Generate required icon sizes, screenshots, Play Store metadata                                    |
| Android signing + build          | —     | Small  | Keystore setup, `gradlew bundleRelease`, Play Store listing                                       |
| Platform detection utility       | —     | Small  | `Capacitor.isNativePlatform()` helper — suppress PWA install prompt in native shell               |
| Android push notifications (FCM) | —     | Medium | Firebase Cloud Messaging via `@capacitor/push-notifications`. Replaces web push in native context |

### v1.0 — Launch

| Feature               | Issue | Effort       | Description                                                                                             |
| --------------------- | ----- | ------------ | ------------------------------------------------------------------------------------------------------- |
| Calendar sync         | #10   | Medium-Large | Google Calendar OAuth + iCal sync. Phases 3–5 of [availability-calendar spec](availability-calendar.md) |
| Channels              | #27   | Medium-Large | Shared posting contexts for hackathons, courses, orgs                                                   |
| Match pre-computation | #13   | Large        | Background pre-computation for instant match results at scale                                           |
| LLM cost tiering      | —     | Medium       | Tier models by feature: cheap for chips/format, mid for extraction, high for deep matching              |
| Production hardening  | —     | Large        | Performance audit, error monitoring, rate limiting, security review                                     |

### v1.1 — Post-Launch

| Feature                      | Issue | Effort | Description                                                                        |
| ---------------------------- | ----- | ------ | ---------------------------------------------------------------------------------- |
| Posting images               | #29   | Medium | Upload and display images on postings (Supabase Storage)                           |
| Ghost text (LLM suggestions) | —     | Medium | Context-aware inline suggestions as user types, including prefilled slash commands |
| Email auth fix (SMTP)        | #37   | Small  | Configure Supabase SMTP for confirmation emails                                    |

---

## Backlog (Unprioritized)

These are ideas without a target milestone. They'll be prioritized as the product evolves:

- Auto-location detection (#16) — detect user location from IP for matching defaults
- Real-time voice upgrade — streaming voice input (OpenAI Realtime, Gemini Live)
- Auto-generated thumbnails — generate posting thumbnails from text via Gemini
- Analytics dashboard for posting owners
- Public posting embed / share links
- iOS Capacitor build — Apple Developer account, Xcode signing, App Store listing (deferred; PWA covers iOS)
- Deep links — `meshit.app/postings/123` opens native app via `@capacitor/app` universal links
- Standardize date formatting across the app (#44)
- Add skeleton/spinner loading states for slow connections (#48)
- Configurable matching weights — weight sliders per posting (revisit after deep matching)
- Email + push notifications (#14) — email and push delivery channels (in-app already implemented)
- Daily digest — cron-based email digest of new relevant postings (Resend)
- Auto-translation — posts auto-translated based on user language settings, communication language as matching criterion

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
