# Roadmap

## Version & Status

- **Current version**: 0.2.0
- **Last updated**: 2026-02-15
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

---

## In Progress

- [ ] **Waitlist** — `feat/waitlist` branch: `waitlisted` status, auto-waitlist when filled, promotion logic, UI indicators. Depends on auto-accept (done). (#9)

---

## Milestones

### v0.3 — Matching & Filtering

| Feature                       | Issue | Effort       | Description                                                                             |
| ----------------------------- | ----- | ------------ | --------------------------------------------------------------------------------------- |
| Hard filter enforcement       | —     | Medium       | Two-stage matching: hard filters (context, category, skill, location) then soft scoring |
| Max distance matching         | #31   | Medium       | Location-based distance as a matching dimension                                         |
| Availability input & matching | —     | Medium-Large | Weekly time grid / slot picker UI; posting-level scheduling; overlap scoring            |
| Auto-location detection       | #16   | Small        | Detect user location from IP for matching defaults                                      |
| Configurable matching weights | —     | Small-Medium | Weight sliders on posting creation; stored per posting; passed to scoring               |
| Fix 0% match score display    | #46   | Small        | Investigate and fix 0% matches showing as "new match" on dashboard                      |

### v0.4 — Engagement & Discovery

| Feature                            | Issue | Effort | Description                                                        |
| ---------------------------------- | ----- | ------ | ------------------------------------------------------------------ |
| Bookmarks page                     | —     | Small  | `/bookmarks` for saved postings; sidebar nav item                  |
| Notification system (email + push) | #14   | Large  | In-app + email + push notifications for matches, messages, invites |
| Daily digest notifications         | —     | Medium | Cron-based email digest of new relevant postings (Resend)          |
| Posting images                     | #29   | Medium | Upload and display images on postings                              |
| Email auth fix (SMTP)              | #37   | Small  | Configure Supabase SMTP for confirmation emails                    |

### v0.5 — Sequential Invite & Channels

| Feature                      | Issue | Effort       | Description                                                                           |
| ---------------------------- | ----- | ------------ | ------------------------------------------------------------------------------------- |
| Sequential invite mode       | —     | Large        | Headline feature: ordered invite queue, one-by-one requests, decline/timeout handling |
| Channels for shared contexts | #27   | Medium-Large | Shared posting contexts for hackathons, courses, orgs                                 |
| Markdown-first interface     | #28   | Medium       | Markdown editing and export for postings                                              |

### v1.0 — Launch

| Feature                   | Issue | Effort       | Description                                                                    |
| ------------------------- | ----- | ------------ | ------------------------------------------------------------------------------ |
| Match pre-computation     | #13   | Large        | Background pre-computation for instant match results at scale                  |
| Calendar sync             | #10   | Medium       | Integration with Google Calendar / iCal for availability                       |
| Real-time voice upgrade   | —     | Large        | Upgrade from turn-based to streaming (OpenAI Realtime, Gemini Live, or custom) |
| Auto-generated thumbnails | —     | Small-Medium | Generate posting thumbnails from transcript via Gemini                         |
| Production hardening      | —     | Large        | Performance audit, error monitoring, rate limiting, security review            |

---

## Backlog (Unprioritized)

These are ideas without a target milestone. They'll be prioritized as the product evolves:

- Connections / social graph between users
- Posting templates for common categories
- Analytics dashboard for posting owners
- Public posting embed / share links
- Multi-language support (i18n)
- Mobile app (React Native or PWA enhancement)
- Improve mic button visibility in textareas (#43)
- Standardize date formatting across the app (#44)
- Add CTAs to empty states (#45)
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
