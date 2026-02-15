# Roadmap

> **Note**: Items below may need freshness review — priorities and completion status may have shifted since last update.

Gap analysis between the [spec](mesh.md), [UX spec](ux.md) and current implementation on the `dev` branch. Prioritized into actionable steps.

## Current State (Feb 2026)

The dev branch has completed Phase 1 of the redesign:

- **Terminology**: projects → postings, friend-ask → sequential invite, apply → join/request to join, semantic → relevance, reactivate → repost + extend deadline
- **Data model**: new schema with `postings` table (category, tags, mode, skill_level_min, context_identifier, etc.)
- **Profile updates**: free-form AI extraction with undo
- **Core features**: auth, onboarding (text), dashboard, profiles, posting CRUD, matching, real-time messaging (inbox), settings

## Completed in This Pass

- [x] **Voice input integration** — SpeechInput wired into onboarding (AI extract + bio), posting creation (description + AI extract), and browse search
- [x] **Posting expiration display + reactivation** — Expired badge, countdown, Repost + Extend Deadline buttons for owners, expired postings filtered from discover
- [x] **Advanced filters on browse page** — Category and mode filters with toggle panel
- [x] **Deprecated /messages page removed** — Links updated to /inbox

---

## Remaining Steps

### Priority 1 — Core Spec Gaps

#### 1.1 Sequential Invite Mode

**Spec ref:** "Select and order friends to ask; send requests one-by-one until one accepts"
**UX spec:** `[planned]`

**Current state:** `mode: "friend_ask"` exists in the data model (DB column stays `friend_ask` for now; UI label is "Sequential Invite") but there's no connection list, invite queue, or sequential invite flow.

**Steps:**

- [ ] Design connections data model (connections between users)
- [ ] Add DB table: `sequential_invites` (posting_id, ordered_user_ids[], current_index, status)
- [ ] Build "Sequential Invite" mode UI on posting creation
- [ ] Build connection selection + ordering UI (drag-to-reorder)
- [ ] Implement sequential invite logic with notifications
- [ ] Handle edge cases: all declined, timeout, posting expiry

**Effort:** Large.

#### 1.2 Context Identifier Input on Posting Creation

**Current state:** `context_identifier` column exists in postings table but the creation form doesn't expose it.

**Steps:**

- [ ] Add context identifier field to new posting form
- [ ] Show context_identifier as a badge on posting cards (done in browse, needed on detail page)
- [ ] Use as a filter option

**Effort:** Small.

---

### Priority 2 — Matching Algorithm Alignment

#### 2.1 Availability Input & Matching

**Spec ref:** Week-based (recurring) and block-based (specific dates) availability.

**Current state:** `availability_slots` column exists in profiles. Matching uses it in scoring. No UI for inputting availability.

**Steps:**

- [ ] Design availability input UI (weekly time grid or slot picker)
- [ ] Add to profile editor
- [ ] Add posting-level "when is this" input
- [ ] Verify availability overlap scoring works correctly

**Effort:** Medium-Large.

#### 2.2 User-Configurable Matching Weights

**Spec ref:** "Users can adjust weights to reflect their priorities"

**Steps:**

- [ ] Add weight sliders to posting creation or profile settings
- [ ] Store custom weights
- [ ] Pass to scoring function

**Effort:** Small-Medium.

#### 2.3 Hard Filter Enforcement

**Spec ref:** Two-stage matching — hard filters (pass/fail) then soft scoring.

**Steps:**

- [ ] Add explicit hard filter stage before scoring
- [ ] Context identifier exact match
- [ ] Category match
- [ ] Skill level minimum
- [ ] Show "Filtered out" reason

**Effort:** Medium.

---

### Priority 3 — UX Polish

#### 3.1 Daily Digest Notifications

**UX spec:** `[planned]`

**Steps:**

- [ ] Set up cron job (Vercel Cron or Supabase Edge Function)
- [ ] Aggregate new relevant postings per user
- [ ] Generate and send digest email via Resend

#### 3.2 Auto-Generated Posting Thumbnails

**Spec ref:** "Auto-create posting thumbnail from transcript (Gemini)"

#### 3.3 Real-Time Voice Upgrade

**Docs:** Three upgrade paths documented (OpenAI Realtime, Gemini Live, Custom Pipeline). Currently using turn-based.

#### 3.4 Bookmarks Page

**Steps:**

- [ ] Create `/bookmarks` page (saved postings for later review)
- [ ] Add sidebar nav item
- [ ] Move interest-sent / saved postings logic from Matches page

#### 3.5 Repost + Extend Deadline

**Steps:**

- [ ] Replace single "Reactivate" button with "Repost" and "Extend Deadline"
- [ ] "Repost" resets join requests and bumps posting to top of feed
- [ ] "Extend Deadline" pushes deadline forward, keeps existing join requests

#### 3.6 Auto-Accept Setting

**Steps:**

- [ ] Add `auto_accept` boolean field to postings
- [ ] Add toggle in posting creation form
- [ ] CTA dynamically shows "Join" (auto-accept) or "Request to join" (manual review)

#### 3.7 Terminology Migration

**Steps:**

- [ ] Update all UI labels per terminology spec (`.prompts/terminology_specification.md`)
- [ ] Grep for old terms to ensure none remain

---

## Recommended Execution Order

| Step | Feature                      | Rationale                            |
| ---- | ---------------------------- | ------------------------------------ |
| 1    | 3.7 Terminology Migration    | Quick win, aligns UI with spec       |
| 2    | 1.2 Context Identifier Input | Trivial, column exists               |
| 3    | 3.4 Bookmarks Page           | Page restructure, decouples Matches  |
| 4    | 3.5 Repost + Extend Deadline | UX clarity for expired postings      |
| 5    | 3.6 Auto-Accept Setting      | Enables Join vs Request to join CTA  |
| 6    | 2.1 Availability Input       | Key matching dimension, schema ready |
| 7    | 2.3 Hard Filter Enforcement  | Aligns matching with spec            |
| 8    | 2.2 Configurable Weights     | Empowers users                       |
| 9    | 1.1 Sequential Invite Mode   | Headline feature, complex            |
| 10   | 3.1 Daily Digest             | Nice-to-have                         |
| 11   | 3.2 Thumbnails               | Nice-to-have                         |
| 12   | 3.3 Real-Time Voice          | Infrastructure upgrade               |
