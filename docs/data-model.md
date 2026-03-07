# Data Model

> Column types, nullability, defaults, indexes, and RLS policies are introspectable — run
> `supabase db dump` or check `supabase/migrations/`. This file documents only what the
> schema itself doesn't tell you.

## Table Overview

| Table                        | Purpose                                                                      |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `profiles`                   | 1:1 with `auth.users`. Skills, preferences, embedding, source text.          |
| `postings`                   | Collaboration listings. Evolved from legacy `projects` table.                |
| `matches`                    | User×posting scores + deep match results. Unique on `(project_id, user_id)`. |
| `availability_windows`       | Minute-level recurring/specific time windows for profiles and postings.      |
| `calendar_connections`       | Google Calendar / iCal feed connections per profile.                         |
| `calendar_busy_blocks`       | Imported busy blocks from external calendars.                                |
| `friend_asks`                | Sequential/parallel invite sequences for a posting.                          |
| `group_messages`             | Per-posting group chat messages.                                             |
| `group_message_reads`        | Per-user read receipts for group messages.                                   |
| `meeting_proposals`          | Team scheduling proposals on active postings.                                |
| `meeting_responses`          | Per-member responses to meeting proposals.                                   |
| `feedback`                   | User-submitted bugs/suggestions. Write-once.                                 |
| `templates`                  | Posting templates for quick-start content.                                   |
| `skill_nodes`                | Hierarchical skill taxonomy tree.                                            |
| `profile_skills`             | Join: profile × skill_node (with level).                                     |
| `posting_skills`             | Join: posting × skill_node (with level_min).                                 |
| `skill_normalization_cache`  | Maps user-typed strings → skill_nodes to skip repeated LLM resolution.       |
| `notifications`              | In-app notifications with type-specific metadata.                            |
| `conversations` / `messages` | 1:1 DM system (separate from group chat).                                    |

## Relationships

```
auth.users
    └── 1:1 ── profiles
                  ├── 1:N ── postings (creator_id)
                  │             ├── 1:N ── matches (project_id)
                  │             ├── 1:N ── group_messages (posting_id)
                  │             ├── 1:N ── meeting_proposals (posting_id)
                  │             ├── 0:1 ── friend_asks (posting_id)
                  │             └── 0:N ── availability_windows (posting_id)
                  ├── 1:N ── matches (user_id)
                  ├── 0:N ── availability_windows (profile_id)
                  ├── 0:N ── calendar_connections → calendar_busy_blocks
                  ├── 0:N ── profile_skills → skill_nodes
                  ├── 0:N ── notifications
                  └── 0:N ── feedback (nullable user_id)
```

## Semantic Notes

**availability_windows — dual semantics:**
Profile windows = **blocked time** (when the user is NOT free).
Posting windows = **required available time** (when the team should be free).
Scoring: `1 - (blocked_overlap / posting_total)`.

**postings — composable access model:**
Access is additive via independent flags, not a single mode. See `spec/1-posting-access.md`.

- `in_discover` (bool) — appears in platform-wide Discover feed
- `link_token` (text, nullable) — shareable link; null = no link created
- `parent_posting_id` (FK) — context-based access via nesting

**postings — legacy fields:**
`mode` is deprecated in favor of `visibility`. Both exist in schema but `visibility` is canonical.

**profiles — source text undo:**
`source_text` + `previous_source_text` + `previous_profile_snapshot` implement single-level undo
for text-first profile editing.

**skill_normalization_cache:**
On cache hit, verifies the referenced `skill_nodes` row still exists (CASCADE removes cache rows,
but a race is possible — stale entries are deleted and resolution retries).

## JSONB Structures

### availability_slots (profiles)

```typescript
// Map of day → time-of-day slots
type AvailabilitySlots = Record<
  "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
  ("morning" | "afternoon" | "evening")[]
>;
```

### score_breakdown (matches)

```typescript
interface ScoreBreakdown {
  semantic: number; // Embedding similarity (0-1)
  skills_overlap: number; // % of required skills user has (0-1)
  experience_match: number; // Experience level compatibility (0-1)
  commitment_match: number; // Hours alignment (0-1)
  location_match: number; // Location + remote preference (0-1)
  filter_match: number; // Hard filter compliance (0-1)
}
```

### chip_metadata (postings)

Structured metadata for inline editor chips (locations, times, skills) in text-first posting editor.

## Key RPC Functions

| Function                                        | Returns                    | Logic                                                                                                         |
| ----------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `compute_availability_score(profile, posting)`  | `float8`                   | `1 - (blocked_overlap / posting_total)`. Uses `get_effective_blocked_ranges()`. 1.0 if either has no windows. |
| `get_effective_blocked_ranges(profile)`         | `int4range`                | UNION of `availability_windows` + `calendar_busy_blocks` canonical projections.                               |
| `is_posting_team_member(posting, user)`         | `bool`                     | Creator OR accepted applicant. Used by RLS.                                                                   |
| `get_posting_team_member_ids(posting)`          | `uuid[]`                   | Creator + accepted applicants.                                                                                |
| `get_team_common_availability(profile_ids)`     | `TABLE(day, start, end)`   | 15-min windows where no member is blocked.                                                                    |
| `unread_group_message_count(posting, user)`     | `bigint`                   | Unread count for one posting.                                                                                 |
| `unread_group_message_counts(postings[], user)` | `TABLE(posting_id, count)` | Batch unread counts.                                                                                          |

## Data Isolation

Separate Supabase projects — not in-database flags:

| Environment       | Project         |
| ----------------- | --------------- |
| Production (main) | `meshit` (prod) |
| Preview + Dev     | `meshit-dev`    |
