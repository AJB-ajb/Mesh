# Roadmap

## Version & Status

- **Current version**: 0.2.0
- **Last updated**: 2026-02-27
- **Versioning**: Milestone-based semver (`MAJOR.MINOR.PATCH`). See [Update Protocol](#update-protocol).

---

## Implemented (v0.1 → v0.2)

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

---

## Milestones

> **Direction**: The text-first rewrite ([text_first_rewrite.md](../.prompts/text_first_rewrite.md)) is the primary driver for v0.3+. Milestones are organized around its phases. Where this roadmap and the text-first spec conflict, the text-first spec takes precedence.

### v0.3 — Text-First Posting & Navigation

Replace the multi-step posting form with a text field. Finish the navigation redesign. See [text_first_rewrite.md](../.prompts/text_first_rewrite.md) §1–5 and [ux.md](ux.md) for page layouts.

| Feature                        | Issue | Effort       | Description                                                                                                        |
| ------------------------------ | ----- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| Text-first posting creation    | —     | Large        | Single text field + "Post" button. Instant publish, background LLM extraction of metadata (skills, time, location) |
| Extracted metadata review      | —     | Medium       | Post-publish card for reviewing/correcting extracted fields. Corrections update metadata, never modify user's text |
| Markdown rendering (view mode) | #28   | Medium       | Render posting/profile text as markdown. Restricted dialect: bold, lists, headings, inline code, links             |
| Discover page                  | —     | Medium       | New `/discover` — single feed, sorted by match score, saved filter                                                 |
| My Postings page               | —     | Small-Medium | Refactor `/postings` to flat list of own postings. Cards show team fill, pending actions                           |
| Posting detail tabs            | —     | Medium       | `/postings/[id]` → Edit · Manage · Project tabs. Disabled states for inactive tabs                                 |
| Active page                    | —     | Medium       | New `/active` — active projects (min team reached). Cards show unread messages, role, team fill                    |
| Notifications → header bell    | —     | Small-Medium | Move notifications to header bell dropdown. Remove `/inbox` route                                                  |
| Sidebar & routing update       | —     | Small        | Update nav items, default landing → Active, remove old routes (dashboard, matches, bookmarks, inbox)               |
| Remove Dashboard page          | —     | Small        | Remove `/dashboard` route and components                                                                           |

### v0.4 — Smart Input & Profile

Progressive intelligence on the text field + text-first profile creation. See [text_first_rewrite.md](../.prompts/text_first_rewrite.md) §4.

| Feature                  | Issue | Effort       | Description                                                                                         |
| ------------------------ | ----- | ------------ | --------------------------------------------------------------------------------------------------- |
| Slash commands           | —     | Medium-Large | `/time`, `/location`, `/skills`, `/template` — structured input that produces text or metadata      |
| Quick chips              | —     | Medium       | Context-sensitive suggestion chips below text field (mobile-first). Rule-based initially, LLM later |
| Post-write nudges        | —     | Medium       | LLM suggests missing dimensions after writing (non-blocking, dismissible)                           |
| Auto-format / auto-clean | —     | Medium       | Text tools: add markdown structure (✨) and correct grammar/spelling (🧹) with diff preview         |
| Profile text-first       | —     | Medium       | Paste-and-go profile creation + guided prompts for new users. Same text editor as postings          |
| Mobile keyboard toolbar  | —     | Small        | Quick-access buttons for `/`, `#`, `**`, `-`, `` ` `` above keyboard in markdown fields             |
| Skill gap filling        | —     | Small-Medium | Prompt to describe skills when viewing postings requiring skills not in user's profile              |

### v0.5 — Deep Matching

LLM-based Stage 2 matching + skill system refinements. See [text_first_rewrite.md](../.prompts/text_first_rewrite.md) §6 and [matching.md](matching.md).

| Feature                      | Issue | Effort | Description                                                                                       |
| ---------------------------- | ----- | ------ | ------------------------------------------------------------------------------------------------- |
| LLM deep match (Stage 2)     | —     | Large  | LLM evaluates top ~10–20 fast-filter candidates using full posting + profile text                 |
| Multi-role matching          | —     | Medium | LLM identifies distinct roles in a posting, matches candidates per role separately                |
| Match explanations (premium) | —     | Medium | Human-readable explanation of match quality. Free tier: score only; premium: full explanation     |
| Hard filter enforcement      | —     | Medium | Two-stage: hard filters (context, category, skill, location) then soft scoring                    |
| Tree-aware skill filtering   | —     | Medium | Parent skill selection includes all descendants via recursive CTE                                 |
| Per-skill matching scoring   | —     | Medium | Per-skill level comparison from `posting_skills` join table (replaces averaged `skill_level_min`) |
| Drop old skill columns       | —     | Small  | Remove `skills text[]`, `skill_levels jsonb`, `skill_level_min integer` after migration verified  |
| Max distance matching        | #31   | Medium | Location distance as a matching dimension                                                         |

### v0.6 — Engagement & Polish

| Feature                    | Issue | Effort       | Description                                                                                                   |
| -------------------------- | ----- | ------------ | ------------------------------------------------------------------------------------------------------------- |
| Email + push notifications | #14   | Large        | Email and push delivery (in-app already implemented)                                                          |
| Daily digest               | —     | Medium       | Cron-based email digest of new relevant postings (Resend)                                                     |
| Markdown edit mode         | —     | Medium-Large | WYSIWYG-lite inline markdown rendering while typing (Tiptap or similar). Shared component for all text fields |
| Auto-translation           | —     | Medium-Large | Posts auto-translated based on user language settings. Communication language as matching criterion           |
| Template library           | —     | Medium       | Pre-built templates for common posting types, accessible via `/template`                                      |
| Posting images             | #29   | Medium       | Upload and display images on postings                                                                         |
| Email auth fix (SMTP)      | #37   | Small        | Configure Supabase SMTP for confirmation emails                                                               |

### v1.0 — Launch

| Feature               | Issue | Effort       | Description                                                                                             |
| --------------------- | ----- | ------------ | ------------------------------------------------------------------------------------------------------- |
| Calendar sync         | #10   | Medium-Large | Google Calendar OAuth + iCal sync. Phases 3–5 of [availability-calendar spec](availability-calendar.md) |
| Channels              | #27   | Medium-Large | Shared posting contexts for hackathons, courses, orgs                                                   |
| Match pre-computation | #13   | Large        | Background pre-computation for instant match results at scale                                           |
| LLM cost tiering      | —     | Medium       | Tier models by feature: cheap for chips/format, mid for extraction, high for deep matching              |
| Production hardening  | —     | Large        | Performance audit, error monitoring, rate limiting, security review                                     |

---

## Backlog (Unprioritized)

These are ideas without a target milestone. They'll be prioritized as the product evolves:

- Auto-location detection (#16) — detect user location from IP for matching defaults
- Real-time voice upgrade — streaming voice input (OpenAI Realtime, Gemini Live)
- Auto-generated thumbnails — generate posting thumbnails from text via Gemini
- Analytics dashboard for posting owners
- Public posting embed / share links
- Mobile app (React Native or PWA enhancement)
- Standardize date formatting across the app (#44)
- Add skeleton/spinner loading states for slow connections (#48)
- Configurable matching weights — weight sliders per posting (revisit after deep matching)

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
