# Roadmap

## Version & Status

- **Current version**: 0.2.0
- **Last updated**: 2026-02-18
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

---

## Milestones

### v0.3 — Navigation Redesign

Restructure the top-level UI around four primary pages reflecting the posting lifecycle: discover → recruit → coordinate → connect. See [ux.md](ux.md) for full page layouts.

| Feature                     | Issue | Effort       | Description                                                                                                                                                       |
| --------------------------- | ----- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discover page               | —     | Medium       | New `/discover` — single feed merging old Postings (Discover), Matches, Bookmarks. Sorted by match score, saved filter                                            |
| My Postings page            | —     | Small-Medium | Refactor `/postings` to flat list of own postings only. Cards show team fill `current / min (max)`, pending actions                                               |
| Posting detail tabs         | —     | Medium       | Refactor `/postings/[id]` into Edit · Manage · Project tabs. Manage: applicants, sequential invites. Project: group chat, team. Disabled states for inactive tabs |
| Active page                 | —     | Medium       | New `/active` — list of projects at min team size (created + joined). Cards show unread messages, role, team fill                                                 |
| [x] Project group chat      | —     | Medium-Large | Group messaging per posting (Project tab). Distinct from 1:1 DMs in Connections                                                                                   |
| [x] Connections page        | —     | Medium       | New `/connections` — split layout: connection list with DMs, pending requests (collapsible), add/QR/share actions                                                 |
| Notifications → header bell | —     | Small-Medium | Move notifications out of Inbox page into header bell dropdown. Remove `/inbox` route                                                                             |
| Sidebar & routing update    | —     | Small        | Update sidebar nav items, default landing page → Active, remove old routes (dashboard, matches, bookmarks, inbox)                                                 |
| [x] Connection improvements | —     | Medium       | QR code for connecting, share profile link, connect button on profiles, search by name/email                                                                      |
| Remove Dashboard page       | —     | Small        | Remove `/dashboard` route and components                                                                                                                          |

### v0.4 — Matching & Filtering

| Feature                           | Issue | Effort       | Description                                                                                                                                            |
| --------------------------------- | ----- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hard filter enforcement           | —     | Medium       | Two-stage matching: hard filters (context, category, skill, location) then soft scoring                                                                |
| Tree-aware skill filtering        | —     | Medium       | Selecting a parent skill node includes all descendants via recursive CTE (e.g., "Programming" matches Python)                                          |
| Per-skill matching scoring        | —     | Medium       | Replace averaged `skill_level_min` with per-skill level comparison from `posting_skills` join table                                                    |
| Drop old skill columns (contract) | —     | Small        | Drop `skills text[]`, `skill_levels jsonb`, `skill_level_min integer` columns (expand phase done — code reads join tables)                             |
| Existing data migration (skills)  | —     | Medium       | Batch-process existing free-form skills through LLM normalization (pipeline exists at `/api/skills/normalize`, batch run needed)                       |
| Max distance matching             | #31   | Medium       | Location-based distance as a matching dimension                                                                                                        |
| [x] Availability input & matching | —     | Medium-Large | Minute-level windows, quick/detailed mode, posting availability, overlap scoring. Phases 1-2 of [availability-calendar spec](availability-calendar.md) |
| Auto-location detection           | #16   | Small        | Detect user location from IP for matching defaults                                                                                                     |
| Configurable matching weights     | —     | Small-Medium | Weight sliders on posting creation; stored per posting; passed to scoring                                                                              |
| Fix 0% match score display        | #46   | Small        | Investigate and fix 0% matches showing as "new match" on dashboard                                                                                     |

### v0.5 — Engagement & Notifications

| Feature                    | Issue | Effort | Description                                                                          |
| -------------------------- | ----- | ------ | ------------------------------------------------------------------------------------ |
| Email + push notifications | #14   | Large  | Email and push delivery for notifications (in-app notifications already implemented) |
| Daily digest notifications | —     | Medium | Cron-based email digest of new relevant postings (Resend)                            |
| Posting images             | #29   | Medium | Upload and display images on postings                                                |
| Email auth fix (SMTP)      | #37   | Small  | Configure Supabase SMTP for confirmation emails                                      |

### v0.6 — Channels & Content

| Feature                      | Issue | Effort       | Description                                           |
| ---------------------------- | ----- | ------------ | ----------------------------------------------------- |
| Channels for shared contexts | #27   | Medium-Large | Shared posting contexts for hackathons, courses, orgs |
| Markdown-first interface     | #28   | Medium       | Markdown editing and export for postings              |

### v1.0 — Launch

| Feature                   | Issue | Effort       | Description                                                                                                                                                      |
| ------------------------- | ----- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Match pre-computation     | #13   | Large        | Background pre-computation for instant match results at scale                                                                                                    |
| Calendar sync             | #10   | Medium-Large | Google Calendar OAuth + iCal feed sync, busy block overlay, AI extraction, team scheduling. Phases 3-5 of [availability-calendar spec](availability-calendar.md) |
| Real-time voice upgrade   | —     | Large        | Upgrade from turn-based to streaming (OpenAI Realtime, Gemini Live, or custom)                                                                                   |
| Auto-generated thumbnails | —     | Small-Medium | Generate posting thumbnails from transcript via Gemini                                                                                                           |
| Production hardening      | —     | Large        | Performance audit, error monitoring, rate limiting, security review                                                                                              |

---

## Backlog (Unprioritized)

These are ideas without a target milestone. They'll be prioritized as the product evolves:

- Posting templates for common categories
- Analytics dashboard for posting owners
- Public posting embed / share links
- Multi-language support (i18n) — recommended: `next-intl`; start by migrating `src/lib/labels.ts`
- Mobile app (React Native or PWA enhancement)
- Improve mic button visibility in textareas (#43)
- Standardize date formatting across the app (#44)
- Keep AI Extract reference text visible while typing (#47)
- Add skeleton/spinner loading states for slow connections (#48)

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
