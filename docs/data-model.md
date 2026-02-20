# Data Model Documentation

> **Important:** Keep this document updated when making database schema changes.
> See `.AGENTS.md` for instructions.

## Overview

This document describes the database schema for the Mesh application. It covers all tables, their fields, relationships, and JSONB structures.

---

## Tables

### profiles

User profile information including skills, preferences, and matching-related data.

| Field                       | Type             | Nullable | Default      | Description                                                                 |
| --------------------------- | ---------------- | -------- | ------------ | --------------------------------------------------------------------------- |
| `user_id`                   | uuid             | NO       | -            | Primary key, references `auth.users(id)`                                    |
| `full_name`                 | text             | YES      | null         | User's display name                                                         |
| `headline`                  | text             | YES      | null         | Short professional headline                                                 |
| `bio`                       | text             | YES      | null         | Longer biography/description                                                |
| `location`                  | text             | YES      | null         | Human-readable location string for display                                  |
| `location_lat`              | double precision | YES      | null         | Latitude coordinate for matching                                            |
| `location_lng`              | double precision | YES      | null         | Longitude coordinate for matching                                           |
| `interests`                 | text[]           | YES      | null         | Array of interest strings                                                   |
| `languages`                 | text[]           | YES      | '{}'         | Spoken languages (ISO codes: en, de, es, etc.)                              |
| `location_mode`             | text             | YES      | 'either'     | One of: remote, in_person, either                                           |
| `location_preference`       | double precision | YES      | null         | 0.0 = in-person only, 0.5 = either, 1.0 = remote only                       |
| `availability_slots`        | jsonb            | YES      | null         | Weekly availability grid, e.g. `{"mon": ["morning","evening"]}`             |
| `collaboration_style`       | text             | YES      | null         | **Optional:** One of: async, sync, hybrid                                   |
| `portfolio_url`             | text             | YES      | null         | Link to portfolio                                                           |
| `github_url`                | text             | YES      | null         | Link to GitHub profile                                                      |
| `source_text`               | text             | YES      | null         | Free-form text description that profile fields are derived from             |
| `previous_source_text`      | text             | YES      | null         | Previous source_text for single-level undo                                  |
| `previous_profile_snapshot` | jsonb            | YES      | null         | Previous profile field values (JSON) for single-level undo                  |
| `embedding`                 | vector(1536)     | YES      | null         | OpenAI embedding for semantic matching                                      |
| `created_at`                | timestamptz      | NO       | now()        | Record creation timestamp                                                   |
| `updated_at`                | timestamptz      | NO       | now()        | Last update timestamp (auto-updated)                                        |
| `timezone`                  | text             | YES      | null         | IANA timezone string (e.g., 'Europe/Berlin')                                |
| `calendar_visibility`       | text             | YES      | 'match_only' | `'match_only'` or `'team_visible'` — controls who sees calendar busy blocks |

**RLS Policies:**

- Users can view, insert, and update only their own profile

---

### availability_windows

Minute-level recurring (or specific) time windows for profiles and postings. **Dual semantics**: profile windows represent **unavailable/blocked time** (when the user is NOT free); posting windows represent **required available time** (when the team should be free). Used for overlap-based matching scoring.

| Field             | Type        | Nullable | Default           | Description                                                 |
| ----------------- | ----------- | -------- | ----------------- | ----------------------------------------------------------- |
| `id`              | uuid        | NO       | gen_random_uuid() | Primary key                                                 |
| `profile_id`      | uuid FK     | YES      | null              | References `profiles(user_id)` ON DELETE CASCADE            |
| `posting_id`      | uuid FK     | YES      | null              | References `postings(id)` ON DELETE CASCADE                 |
| `window_type`     | text        | NO       | -                 | `'recurring'` or `'specific'`                               |
| `day_of_week`     | smallint    | YES      | null              | 0=Mon..6=Sun (recurring only)                               |
| `start_minutes`   | smallint    | YES      | null              | 0-1439, minutes from midnight (recurring only)              |
| `end_minutes`     | smallint    | YES      | null              | 1-1440, minutes from midnight (recurring only)              |
| `specific_date`   | date        | YES      | null              | Date for specific windows                                   |
| `start_time_utc`  | timestamptz | YES      | null              | Start time (specific only)                                  |
| `end_time_utc`    | timestamptz | YES      | null              | End time (specific only)                                    |
| `canonical_range` | int4range   | YES      | null              | Trigger-computed: `[day*1440+start, day*1440+end)` for GiST |
| `created_at`      | timestamptz | NO       | now()             | Record creation timestamp                                   |

**Constraints:**

- `exactly_one_owner`: exactly one of `profile_id`/`posting_id` must be set
- `recurring_fields_required`: when `window_type = 'recurring'`, day/start/end NOT NULL
- `specific_fields_required`: when `window_type = 'specific'`, date/start_utc/end_utc NOT NULL
- `end_after_start_recurring`: `end_minutes > start_minutes`
- `end_after_start_specific`: `end_time_utc > start_time_utc`

**Indexes:**

- B-tree on `profile_id` (WHERE NOT NULL)
- B-tree on `posting_id` (WHERE NOT NULL)
- GiST on `canonical_range` (WHERE NOT NULL) — for `&&` overlap queries

**Trigger:** `compute_canonical_range()` — auto-computes `canonical_range` on INSERT/UPDATE for recurring windows.

**RLS Policies:**

- All authenticated users can SELECT (needed for matching)
- INSERT/UPDATE/DELETE restricted to owner (`profile_id = auth.uid()` OR posting's `creator_id = auth.uid()`)

**RPC Functions:**

| Function                       | Parameters                             | Returns     | Description                                                                                                                                                             |
| ------------------------------ | -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compute_availability_score`   | `p_profile_id uuid, p_posting_id uuid` | `float8`    | `1 - (blocked_overlap / posting_total)`. Uses `get_effective_blocked_ranges()` which unions manual windows + calendar busy blocks. 1.0 if either has no windows/blocks. |
| `get_effective_blocked_ranges` | `p_profile_id uuid`                    | `int4range` | Returns all effective blocked canonical ranges for a profile: UNION of availability_windows + calendar_busy_blocks canonical projections.                               |

---

### calendar_connections

External calendar connections (Google Calendar, iCal feeds) for availability sync.

| Field                     | Type        | Nullable | Default           | Description                                      |
| ------------------------- | ----------- | -------- | ----------------- | ------------------------------------------------ |
| `id`                      | uuid        | NO       | gen_random_uuid() | Primary key                                      |
| `profile_id`              | uuid FK     | NO       | -                 | References `profiles(user_id)` ON DELETE CASCADE |
| `provider`                | text        | NO       | -                 | `'google'` or `'ical'`                           |
| `access_token_encrypted`  | bytea       | YES      | null              | AES-256-GCM encrypted Google access token        |
| `refresh_token_encrypted` | bytea       | YES      | null              | AES-256-GCM encrypted Google refresh token       |
| `token_expires_at`        | timestamptz | YES      | null              | Google token expiration time                     |
| `ical_url`                | text        | YES      | null              | iCal feed URL                                    |
| `watch_channel_id`        | text        | YES      | null              | Google Calendar Watch channel ID                 |
| `watch_resource_id`       | text        | YES      | null              | Google Calendar Watch resource ID                |
| `watch_expiration`        | timestamptz | YES      | null              | Google Watch channel expiration                  |
| `last_synced_at`          | timestamptz | YES      | null              | Last successful sync timestamp                   |
| `sync_status`             | text        | NO       | 'pending'         | One of: pending, syncing, synced, error          |
| `sync_error`              | text        | YES      | null              | Last sync error message                          |
| `created_at`              | timestamptz | NO       | now()             | Record creation timestamp                        |
| `updated_at`              | timestamptz | NO       | now()             | Last update timestamp                            |

**Indexes:** Unique partial index on `(profile_id) WHERE provider = 'google'` (one Google connection per profile). B-tree on `profile_id`.

**RLS:** Owner-only CRUD (`profile_id = auth.uid()`).

---

### calendar_busy_blocks

Busy time blocks imported from external calendars. Replaced on each sync cycle.

| Field              | Type        | Nullable | Default           | Description                                             |
| ------------------ | ----------- | -------- | ----------------- | ------------------------------------------------------- |
| `id`               | uuid        | NO       | gen_random_uuid() | Primary key                                             |
| `connection_id`    | uuid FK     | NO       | -                 | References `calendar_connections(id)` ON DELETE CASCADE |
| `profile_id`       | uuid FK     | NO       | -                 | References `profiles(user_id)` ON DELETE CASCADE        |
| `start_time`       | timestamptz | NO       | -                 | Busy period start                                       |
| `end_time`         | timestamptz | NO       | -                 | Busy period end                                         |
| `canonical_ranges` | int4range[] | YES      | null              | Canonical week projection for scoring                   |
| `created_at`       | timestamptz | NO       | now()             | Record creation timestamp                               |

**Indexes:** B-tree on `profile_id`, B-tree on `connection_id`, GIN on `canonical_ranges`.

**RLS:** All authenticated can SELECT (for matching). Owner-only INSERT/DELETE.

---

### projects

Project listings created by users seeking collaborators.

| Field              | Type         | Nullable | Default           | Description                                                                 |
| ------------------ | ------------ | -------- | ----------------- | --------------------------------------------------------------------------- |
| `id`               | uuid         | NO       | gen_random_uuid() | Primary key                                                                 |
| `creator_id`       | uuid         | NO       | -                 | References `profiles.user_id`                                               |
| `title`            | text         | NO       | -                 | Project title                                                               |
| `description`      | text         | NO       | -                 | Project description                                                         |
| `required_skills`  | text[]       | NO       | '{}'              | Skills needed for the project                                               |
| `team_size`        | integer      | NO       | 3                 | Target team size                                                            |
| `experience_level` | text         | YES      | null              | Required level: any, beginner, intermediate, advanced, junior, senior, lead |
| `commitment_hours` | integer      | YES      | null              | Expected hours per week                                                     |
| `timeline`         | text         | YES      | null              | One of: weekend, 1_week, 1_month, ongoing                                   |
| `hard_filters`     | jsonb        | YES      | null              | See JSONB structure below                                                   |
| `embedding`        | vector(1536) | YES      | null              | OpenAI embedding for semantic matching                                      |
| `status`           | text         | NO       | 'open'            | One of: open, closed, filled, expired                                       |
| `created_at`       | timestamptz  | NO       | now()             | Record creation timestamp                                                   |
| `updated_at`       | timestamptz  | NO       | now()             | Last update timestamp (auto-updated)                                        |
| `expires_at`       | timestamptz  | NO       | -                 | Project expiration date                                                     |

**RLS Policies:**

- Open projects are viewable by everyone
- Creators can view all their projects regardless of status
- Only creators can insert, update, and delete their projects

---

### postings (current schema)

> **Note:** The legacy `projects` table above shows the original schema. The current `postings` table includes additional fields from the redesign migrations.

**Additional fields (not in legacy `projects` table):**

| Field                       | Type    | Nullable | Default    | Description                                                              |
| --------------------------- | ------- | -------- | ---------- | ------------------------------------------------------------------------ |
| `mode`                      | text    | NO       | 'open'     | One of: `open`, `friend_ask`. **Deprecated** — use `visibility` instead. |
| `visibility`                | text    | YES      | 'public'   | One of: `public`, `private`. Controls discoverability. Replaces `mode`.  |
| `auto_accept`               | boolean | NO       | false      | Instantly accept anyone who joins                                        |
| `availability_mode`         | text    | NO       | 'flexible' | One of: flexible, recurring, specific_dates                              |
| `timezone`                  | text    | YES      | null       | IANA timezone string                                                     |
| `location_mode`             | text    | YES      | null       | One of: remote, in_person, either                                        |
| `location_name`             | text    | YES      | null       | Human-readable location string                                           |
| `location_lat`              | double  | YES      | null       | Latitude                                                                 |
| `location_lng`              | double  | YES      | null       | Longitude                                                                |
| `max_distance_km`           | integer | YES      | null       | Hard filter for in-person distance                                       |
| `natural_language_criteria` | text    | YES      | null       | Free-form matching criteria                                              |

---

### friend_asks

Sequential or parallel invite sequences. A friend_ask tracks inviting connections to a posting.

| Field                   | Type        | Nullable | Default           | Description                                            |
| ----------------------- | ----------- | -------- | ----------------- | ------------------------------------------------------ |
| `id`                    | uuid        | NO       | gen_random_uuid() | Primary key                                            |
| `posting_id`            | uuid FK     | NO       | —                 | References `postings(id)`                              |
| `creator_id`            | uuid FK     | NO       | —                 | References `profiles(user_id)` — the posting owner     |
| `ordered_friend_list`   | uuid[]      | NO       | —                 | Ordered list of connection user IDs to invite          |
| `current_request_index` | integer     | NO       | 0                 | Index of the currently-invited connection (sequential) |
| `invite_mode`           | text        | NO       | 'sequential'      | One of: `sequential`, `parallel`                       |
| `declined_list`         | uuid[]      | NO       | '{}'              | User IDs who declined (used in parallel mode)          |
| `status`                | text        | NO       | 'pending'         | One of: pending, accepted, completed, cancelled        |
| `created_at`            | timestamptz | NO       | now()             | Record creation timestamp                              |
| `updated_at`            | timestamptz | NO       | now()             | Last update timestamp                                  |

**RLS Policies:**

- SELECT: `creator_id = auth.uid()` OR `auth.uid() = ANY(ordered_friend_list)`
- INSERT/UPDATE: `creator_id = auth.uid()` for creation/cancellation; invitees can respond via API

---

### matches

Matches between users and projects, including scores and status.

| Field              | Type        | Nullable | Default           | Description                                  |
| ------------------ | ----------- | -------- | ----------------- | -------------------------------------------- |
| `id`               | uuid        | NO       | gen_random_uuid() | Primary key                                  |
| `project_id`       | uuid        | NO       | -                 | References `projects.id`                     |
| `user_id`          | uuid        | NO       | -                 | References `profiles.user_id`                |
| `similarity_score` | float       | NO       | -                 | Overall match score (0-1)                    |
| `explanation`      | text        | YES      | null              | Human-readable match explanation             |
| `score_breakdown`  | jsonb       | YES      | null              | See JSONB structure below                    |
| `status`           | text        | NO       | 'pending'         | One of: pending, applied, accepted, declined |
| `created_at`       | timestamptz | NO       | now()             | Record creation timestamp                    |
| `responded_at`     | timestamptz | YES      | null              | When user/owner responded                    |
| `updated_at`       | timestamptz | NO       | now()             | Last update timestamp (auto-updated)         |

**Constraints:**

- Unique constraint on `(project_id, user_id)` - one match per user per project

**RLS Policies:**

- Users can view matches where they are the applicant
- Project creators can view matches for their projects
- Authenticated users can create matches
- Users can update their own matches; creators can update matches for their projects

---

### feedback

User-submitted feedback (bugs, suggestions, irritations). Write-once — no `updated_at`.

| Field        | Type        | Nullable | Default           | Description                                     |
| ------------ | ----------- | -------- | ----------------- | ----------------------------------------------- |
| `id`         | uuid        | NO       | gen_random_uuid() | Primary key                                     |
| `user_id`    | uuid        | YES      | null              | References `profiles.user_id`, NULL = anonymous |
| `message`    | text        | NO       | -                 | Feedback content                                |
| `mood`       | text        | YES      | null              | CHECK: frustrated, neutral, happy               |
| `page_url`   | text        | NO       | -                 | URL where feedback was submitted                |
| `user_agent` | text        | YES      | null              | Browser user agent string                       |
| `created_at` | timestamptz | NO       | now()             | Submission timestamp                            |

**RLS Policies:**

- INSERT: Anyone can submit feedback (including anonymous/unauthenticated)
- SELECT: Authenticated users can read only their own feedback (`user_id = auth.uid()`)

---

## JSONB Structures

### availability_slots (profiles)

Stored in `profiles.availability_slots`:

```typescript
// Map of day → array of time-of-day slots
// Days: mon, tue, wed, thu, fri, sat, sun
// Slots: morning, afternoon, evening
type AvailabilitySlots = Record<string, string[]>;
// Example: { "mon": ["morning", "evening"], "sat": ["afternoon"] }
```

### score_breakdown (matches)

Stored in `matches.score_breakdown`:

```typescript
interface ScoreBreakdown {
  semantic: number; // Embedding similarity (0-1)
  skills_overlap: number; // % of required skills user has (0-1)
  experience_match: number; // Experience level compatibility (0-1)
  commitment_match: number; // Hours alignment (0-1)
  location_match: number; // Location + remote preference compatibility (0-1)
  filter_match: number; // Hard filter compliance score (0-1)
}
```

---

## Relationships

```
auth.users
    │
    └── 1:1 ── profiles (user_id)
                   │
                   ├── 1:N ── projects (creator_id)
                   │              │
                   │              └── 1:N ── matches (project_id)
                   │
                   ├── 1:N ── matches (user_id)
                   │
                   └── 0:N ── feedback (user_id, nullable)
```

---

## Legacy Fields

Fields kept for backward compatibility but superseded by newer fields:

| Table    | Field                          | Superseded By                  | Reason Kept                       |
| -------- | ------------------------------ | ------------------------------ | --------------------------------- |
| profiles | `location` (text)              | `location_lat`, `location_lng` | Human-readable display in UI      |
| profiles | `location_preference` (double) | `location_mode` (text)         | Continuous scale kept for scoring |
| profiles | `collaboration_style`          | —                              | Optional, demoted from required   |

### Removed Columns (dropped in redesign migration)

| Table    | Field                 | Replaced By                             | Migration                                     |
| -------- | --------------------- | --------------------------------------- | --------------------------------------------- |
| profiles | `experience_level`    | `skill_levels` per-domain               | `20260207000000_redesign_postings_schema.sql` |
| profiles | `remote_preference`   | `location_mode` + `location_preference` | `20260207000000_redesign_postings_schema.sql` |
| profiles | `availability_hours`  | `availability_slots`                    | `20260207000000_redesign_postings_schema.sql` |
| profiles | `project_preferences` | — (removed)                             | `20260207000000_redesign_postings_schema.sql` |
| profiles | `hard_filters`        | — (removed)                             | `20260207000000_redesign_postings_schema.sql` |
| profiles | `skills`              | `profile_skills` join table             | `20260218155203_drop_old_skill_columns.sql`   |
| profiles | `skill_levels`        | `profile_skills` join table (per-skill) | `20260218155203_drop_old_skill_columns.sql`   |
| postings | `skills`              | `posting_skills` join table             | `20260218155203_drop_old_skill_columns.sql`   |
| postings | `skill_level_min`     | `posting_skills.level_min` (per-skill)  | `20260218155203_drop_old_skill_columns.sql`   |

---

## Group Chat

Group chat is implemented with two separate tables, distinct from the 1:1 DM system (`conversations` / `messages`). One chat per posting — `posting_id` is the conversation identifier.

### group_messages

| Field        | Type        | Nullable | Default           | Description                                      |
| ------------ | ----------- | -------- | ----------------- | ------------------------------------------------ |
| `id`         | uuid        | NO       | gen_random_uuid() | Primary key                                      |
| `posting_id` | uuid FK     | NO       | —                 | References `postings(id)` ON DELETE CASCADE      |
| `sender_id`  | uuid FK     | NO       | —                 | References `profiles(user_id)` ON DELETE CASCADE |
| `content`    | text        | NO       | —                 | Message body                                     |
| `created_at` | timestamptz | NO       | now()             | Send timestamp                                   |

**RLS Policies:**

- SELECT: authenticated user is the posting creator OR has an `accepted` application on the posting
- INSERT: same membership check + `sender_id = auth.uid()`

**Indexes:** `(posting_id, created_at)`, `sender_id`

**Realtime:** table is added to `supabase_realtime` publication; clients subscribe via `group-messages:{postingId}` channel.

### group_message_reads

Per-user read receipts for group messages. Replaces the single `read` boolean used in 1:1 messages.

| Field        | Type        | Nullable                | Default           | Description                                       |
| ------------ | ----------- | ----------------------- | ----------------- | ------------------------------------------------- |
| `id`         | uuid        | NO                      | gen_random_uuid() | Primary key                                       |
| `message_id` | uuid FK     | NO                      | —                 | References `group_messages(id)` ON DELETE CASCADE |
| `user_id`    | uuid FK     | NO                      | —                 | References `profiles(user_id)` ON DELETE CASCADE  |
| `read_at`    | timestamptz | NO                      | now()             | When the user read the message                    |
|              | UNIQUE      | `(message_id, user_id)` |                   | Prevents duplicate reads                          |

**RLS Policies:**

- SELECT: `user_id = auth.uid()`
- INSERT: `user_id = auth.uid()`

**Indexes:** `message_id`, `user_id`

### RPC Functions (group chat)

| Function                      | Parameters                             | Returns                                       | Description                                   |
| ----------------------------- | -------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| `unread_group_message_count`  | `p_posting_id uuid, p_user_id uuid`    | `bigint`                                      | Count of unread messages for a single posting |
| `unread_group_message_counts` | `p_posting_ids uuid[], p_user_id uuid` | `TABLE(posting_id uuid, unread_count bigint)` | Batch unread counts for the Active page       |

### Helper Function

`is_team_member(p_posting_id uuid)` — returns `boolean`, checks if `auth.uid()` is the posting creator OR has an `accepted` application. Used internally by RLS policies.

### Relationships

```
postings (id)
    │
    └── 1:N ── group_messages (posting_id)
                    │
                    └── 1:N ── group_message_reads (message_id)
```

---

## Data Isolation

Data isolation is achieved through **separate Supabase projects** rather than in-database flags:

| Environment       | Supabase Project |
| ----------------- | ---------------- |
| Production (main) | `meshit` (prod)  |
| Preview + Dev     | `meshit-dev`     |

This guarantees complete isolation — dev/test data physically cannot appear in production and vice versa. Schema changes can be tested on the dev project before applying to production.

---

## Indexes

### profiles

- Primary key on `user_id`

### projects

- Primary key on `id`
- `projects_status_idx` on `status`
- `projects_creator_idx` on `creator_id`
- `projects_expires_at_idx` on `expires_at`
- `projects_skills_idx` (GIN) on `required_skills`

### matches

- Primary key on `id`
- Unique on `(project_id, user_id)`
- `matches_user_idx` on `user_id`
- `matches_project_idx` on `project_id`
- `matches_status_idx` on `status`
- `matches_user_status_idx` on `(user_id, status)`
- `matches_project_status_idx` on `(project_id, status)`

---

### meeting_proposals

Meeting proposals for team scheduling on active postings.

| Field         | Type        | Nullable | Default           | Description                            |
| ------------- | ----------- | -------- | ----------------- | -------------------------------------- |
| `id`          | uuid        | NO       | gen_random_uuid() | Primary key                            |
| `posting_id`  | uuid        | NO       | -                 | FK → postings(id), ON DELETE CASCADE   |
| `proposed_by` | uuid        | NO       | -                 | FK → profiles(id), ON DELETE CASCADE   |
| `title`       | text        | YES      | null              | Optional meeting title                 |
| `start_time`  | timestamptz | NO       | -                 | Meeting start                          |
| `end_time`    | timestamptz | NO       | -                 | Meeting end                            |
| `status`      | text        | NO       | 'proposed'        | One of: proposed, confirmed, cancelled |
| `created_at`  | timestamptz | NO       | now()             |                                        |
| `updated_at`  | timestamptz | NO       | now()             |                                        |

**RLS Policies:**

- SELECT: team members (via `is_posting_team_member()`)
- INSERT: posting owner only (`proposed_by = auth.uid()`)
- UPDATE: posting owner only (status changes)

**Indexes:**

- `idx_meeting_proposals_posting` on `posting_id`
- `idx_meeting_proposals_status` on `(posting_id, status)`

### meeting_responses

Per-member responses to meeting proposals.

| Field          | Type        | Nullable | Default           | Description                                   |
| -------------- | ----------- | -------- | ----------------- | --------------------------------------------- |
| `id`           | uuid        | NO       | gen_random_uuid() | Primary key                                   |
| `proposal_id`  | uuid        | NO       | -                 | FK → meeting_proposals(id), ON DELETE CASCADE |
| `responder_id` | uuid        | NO       | -                 | FK → profiles(id), ON DELETE CASCADE          |
| `response`     | text        | NO       | -                 | One of: available, unavailable                |
| `created_at`   | timestamptz | NO       | now()             |                                               |
| `updated_at`   | timestamptz | NO       | now()             |                                               |

**Constraints:** UNIQUE on `(proposal_id, responder_id)`

**RLS Policies:**

- SELECT: team members (via proposal → posting)
- INSERT: own response, team members only
- UPDATE: own response only

**Indexes:**

- `idx_meeting_responses_proposal` on `proposal_id`

## RPC Functions (Scheduling)

### is_posting_team_member(p_posting_id, p_user_id)

Returns boolean — checks if user is posting creator or accepted applicant.

### get_posting_team_member_ids(p_posting_id)

Returns `uuid[]` — array of team member IDs (creator + accepted applicants).

### get_team_common_availability(p_profile_ids)

Returns `TABLE(day_of_week int, start_minutes int, end_minutes int)` — 15-minute windows where no team member is blocked (uses `get_effective_blocked_ranges()` per member).
