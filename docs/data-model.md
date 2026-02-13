# Data Model Documentation

> **Important:** Keep this document updated when making database schema changes.
> See `.AGENTS.md` for instructions.

## Overview

This document describes the database schema for the Meshit application. It covers all tables, their fields, relationships, and JSONB structures.

---

## Tables

### profiles

User profile information including skills, preferences, and matching-related data.

| Field                       | Type             | Nullable | Default  | Description                                                           |
| --------------------------- | ---------------- | -------- | -------- | --------------------------------------------------------------------- |
| `user_id`                   | uuid             | NO       | -        | Primary key, references `auth.users(id)`                              |
| `full_name`                 | text             | YES      | null     | User's display name                                                   |
| `headline`                  | text             | YES      | null     | Short professional headline                                           |
| `bio`                       | text             | YES      | null     | Longer biography/description                                          |
| `location`                  | text             | YES      | null     | Human-readable location string for display                            |
| `location_lat`              | double precision | YES      | null     | Latitude coordinate for matching                                      |
| `location_lng`              | double precision | YES      | null     | Longitude coordinate for matching                                     |
| `skills`                    | text[]           | YES      | null     | Array of skill strings (backward-compat keyword matching)             |
| `skill_levels`              | jsonb            | YES      | null     | Domain-to-level map, e.g. `{"frontend": 7, "design": 4}` (0-10 scale) |
| `interests`                 | text[]           | YES      | null     | Array of interest strings                                             |
| `languages`                 | text[]           | YES      | '{}'     | Spoken languages (ISO codes: en, de, es, etc.)                        |
| `location_mode`             | text             | YES      | 'either' | One of: remote, in_person, either                                     |
| `location_preference`       | double precision | YES      | null     | 0.0 = in-person only, 0.5 = either, 1.0 = remote only                 |
| `availability_slots`        | jsonb            | YES      | null     | Weekly availability grid, e.g. `{"mon": ["morning","evening"]}`       |
| `collaboration_style`       | text             | YES      | null     | **Optional:** One of: async, sync, hybrid                             |
| `portfolio_url`             | text             | YES      | null     | Link to portfolio                                                     |
| `github_url`                | text             | YES      | null     | Link to GitHub profile                                                |
| `source_text`               | text             | YES      | null     | Free-form text description that profile fields are derived from       |
| `previous_source_text`      | text             | YES      | null     | Previous source_text for single-level undo                            |
| `previous_profile_snapshot` | jsonb            | YES      | null     | Previous profile field values (JSON) for single-level undo            |
| `embedding`                 | vector(1536)     | YES      | null     | OpenAI embedding for semantic matching                                |
| `created_at`                | timestamptz      | NO       | now()    | Record creation timestamp                                             |
| `updated_at`                | timestamptz      | NO       | now()    | Last update timestamp (auto-updated)                                  |

**RLS Policies:**

- Users can view, insert, and update only their own profile

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

## JSONB Structures

### skill_levels (profiles)

Stored in `profiles.skill_levels`:

```typescript
// Map of domain name → skill level (0-10)
// Reference: 1-2 Beginner, 3-4 Can follow tutorials, 5-6 Intermediate, 7-8 Advanced, 9-10 Expert
type SkillLevels = Record<string, number>;
// Example: { "frontend": 7, "python": 5, "design": 3 }
```

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
                   └── 1:N ── matches (user_id)
```

---

## Legacy Fields

Fields kept for backward compatibility but superseded by newer fields:

| Table    | Field                          | Superseded By                  | Reason Kept                          |
| -------- | ------------------------------ | ------------------------------ | ------------------------------------ |
| profiles | `location` (text)              | `location_lat`, `location_lng` | Human-readable display in UI         |
| profiles | `skills` (text[])              | `skill_levels` (jsonb)         | Keyword matching and backward compat |
| profiles | `location_preference` (double) | `location_mode` (text)         | Continuous scale kept for scoring    |
| profiles | `collaboration_style`          | —                              | Optional, demoted from required      |

### Removed Columns (dropped in redesign migration)

| Table    | Field                 | Replaced By                             | Migration                                     |
| -------- | --------------------- | --------------------------------------- | --------------------------------------------- |
| profiles | `experience_level`    | `skill_levels` per-domain               | `20260207000000_redesign_postings_schema.sql` |
| profiles | `remote_preference`   | `location_mode` + `location_preference` | `20260207000000_redesign_postings_schema.sql` |
| profiles | `availability_hours`  | `availability_slots`                    | `20260207000000_redesign_postings_schema.sql` |
| profiles | `project_preferences` | — (removed)                             | `20260207000000_redesign_postings_schema.sql` |
| profiles | `hard_filters`        | — (removed)                             | `20260207000000_redesign_postings_schema.sql` |

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
