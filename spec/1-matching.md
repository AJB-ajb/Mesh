# Matching

> How users and postings are matched — dimensions, scoring, two-stage pipeline, deep LLM evaluation.

## Overview

The goal is not perfect matching — just better than random chance.

### Design Principles

- **Continuous scales over enums**: Prefer continuous scales with reference points instead of enums
  - Enums need to be extended and predefined, which is inflexible and hard to maintain
- **Principled categories**: Even if factor evaluation is subjective, we define reference points for consistent values across users
- **Natural language input**: Most configuration can be done via natural language (transformed to structured values via AI)
  - Handoff markdown available for fast exchange to other platforms
- **Hierarchical defaults**: Most configuration is on the person-level, with posting-level overrides. Postings can also inherit defaults from other postings.
- **Gradual scoring**: Extrema values are handled gracefully (e.g., strong in-person preference still matches reasonably with slight remote preference)
- **Good enough matching**: We cover common cases well; edge cases can be handled manually or by AI. Looking through ten people is acceptable if the top matches are good enough.

### Core Approach

- Weighted filters per user
- Compatibility = combined scores across dimensions
- Two-stage database filtering using Supabase (PostgreSQL):
  1. Fast filtering using indexed tables (context membership, category, location)
  2. Soft scoring on remaining candidates
- Semantic matching via pgvector for embedding similarity (posting descriptions, tags, natural language criteria)
- Keep raw inputs (e.g., "prefer Monday evening") for user editing and display
- **Context-scoped matching**: Candidate pool narrows by Space — all users for postings in the Global Space (Explore), Space members for postings in public Spaces, no matching for small Spaces (broadcast to members). See [1-spaces.md](1-spaces.md).

### User Experience

- Users can see where they differ in preferences to understand compatibility better
- Users can see how certain alignment is, based on missing data

---

## Dimensions

### Person Dimensions

#### Skill Level

Self-assessed skill level (0-10 scale, slider input):

- Separate per domain
- Domains are hierarchical (e.g., programming > web development > frontend), extrapolates missing levels if necessary
- Reference points:
  - 1-2: Beginner, learning fundamentals
  - 3-4: Can follow tutorials, build simple things with guidance
  - 5-6: Intermediate, can work independently on typical tasks
  - 7-8: Advanced, professional-level, can mentor others
  - 9-10: Expert, deep expertise, recognized in field

#### Collaboration Preferences

Preferred collaboration mode (person-level default, can be overridden per posting):

- **Collaboration intensity** (0-10 scale): From fully independent to constant joint work
- **Preferred activities**: Pair programming, whiteboarding, async review, brainstorming, etc.

This is one of the most significant interpersonal differences in collaborative work (see [vision.md](0-vision.md)).

#### Location Mode

Where collaboration or activity happens (person-level default, can be overridden per posting):

- **Remote**: Fully online
- **In-person**: Must be physically present
- **Flexible**: No strong preference

#### Availability

See [availability-calendar.md](1-availability.md) for the full availability spec including minute-level windows, calendar sync, and overlap scoring.

---

### Posting Dimensions

- **Title**: Name of the posting
- **Description**: Used for semantic matching via pgvector embeddings
- **Category**:
  - Coarse categories (for fast filtering): Study, Hackathon, Personal, Professional, Social
  - Free-form tags/keywords (matched via overlap or pgvector embedding similarity)
- **Parent posting**: Posting-messages in a Space are scoped to the Space's members. See [1-spaces.md](1-spaces.md).
- **Natural language criteria**: Optional, stored as pgvector embeddings for semantic matching beyond structured dimensions
- **Capacity**: How many people the poster is looking for (default: 1)
- **Deadline**: When the posting closes to new join requests
- **Activity date**: When the activity or project starts (optional)
- **Visibility**: Public (appears in Discover for anyone to find) or Private (invite-only). Invites are decoupled from visibility — you can invite connections on any posting.
- **Auto-accept**: Per-posting boolean. When true, the CTA is "Join" (instant). When false, the CTA is "Request to join" (requires poster approval). Default: true for connection-scoped postings, false for open/global postings.
- **Remote preference**: Remote, in-person, or flexible (overrides person-level default)
- **Location**: Where the activity happens (overrides person-level default)
- **Max distance**: Maximum distance for in-person activities (km)
- **Person dimension overrides**: Posting-specific overrides of person-level defaults (e.g., skill level requirement, work style)
- **Defaults from other postings**: A posting can inherit defaults from a previous posting to reduce repeated setup

#### Optional Posting Fields

- **Collaboration preferences**: Intensity (0-10) and preferred activities (pair programming, brainstorming, async review, etc.) — relevant for project-type postings (overrides person-level work style preference)
- **Estimated time**: How much time the activity or project requires (e.g., "2 hours", "10-20h/week for 4 weeks")

### Waitlist

When a posting is filled (accepted count >= `team_size_max`), additional users can join a waitlist. Always available on filled postings — no per-posting toggle.

#### Behavior

- **Joining**: Users who join or request to join a filled posting are automatically waitlisted (status: `waitlisted`)
- **Ordering**: Waitlist is ordered by join time (FIFO — first come, first served)
- **Spot opens**: When an accepted collaborator withdraws or is removed:
  - **Auto-accept posting**: First waitlisted person is instantly promoted to accepted
  - **Manual review posting**: Poster receives notification; can accept or skip waitlisted people
- **Visibility**: Waitlisted users see their position ("You are #3 on the waitlist")
- **Withdrawal**: Waitlisted users can withdraw at any time

#### Status transitions

- `waitlisted` → `accepted` (auto-promote or poster accepts)
- `waitlisted` → `withdrawn` (user withdraws)
- `accepted` → `withdrawn` (triggers waitlist promotion)

#### Edge cases

- Poster manually reopens a filled posting → waitlisted users stay waitlisted (no auto-promote since posting isn't over-capacity)
- Poster reposts → resets everything (waitlisted users are cleared)
- Posting expires → waitlisted users are notified and removed from the waitlist
- Multiple spots open simultaneously → promote in FIFO order

#### Join request statuses

`pending | accepted | rejected | withdrawn | waitlisted`

---

## Compatibility Scoring

### Two-Stage Matching

#### Stage 1: Fast Filter (Negative Elimination)

Hard filters that eliminate clear mismatches — a cost gate for the deep match LLM:

- Context membership (child posting scoped to parent's participants)
- Category (if filtered)
- Skill level minimum (if specified)
- Location mode (if hard constraint, e.g., "in-person only")
- Time/date overlap (does the person's availability overlap with the posting's time at all?)
- pgvector cosine similarity on posting/profile text embeddings (minimum threshold)

Soft scoring dimensions (weighted average) further rank the filtered candidates:

### Compatibility Formula

**Weighted average**: `score = Σ(sᵢ × wᵢ) / Σwᵢ`

Where:

- `sᵢ` = score for dimension i (0-1)
- `wᵢ` = weight for dimension i

With fewer dimensions than a complex project-matching system, a weighted average is more appropriate than a geometric mean — it avoids one low dimension disproportionately tanking the overall score.

### Dimension Weights

User-configurable with defaults:

| Dimension            | Default Weight |
| -------------------- | -------------- |
| Relevance            | 1.0            |
| Availability overlap | 1.0            |
| Skill level          | 0.7            |
| Location preference  | 0.7            |

Users can adjust weights to reflect their priorities.

### Per-Dimension Score Formulas

| Dimension            | Score Formula                                                               |
| -------------------- | --------------------------------------------------------------------------- | --------------- | -------------------------------- |
| Relevance            | pgvector cosine similarity of posting description embeddings                |
| Availability overlap | Fraction of requested time slots that overlap with candidate's availability |
| Skill level          | `1 -                                                                        | levelA - levelB | / 10` (or complementarity score) |
| Location preference  | 1.0 if compatible, 0.5 if partial match, 0.0 if incompatible                |

---

## Technical Implementation

### Database: Supabase + pgvector

- **Supabase** (PostgreSQL) for all structured data storage and queries
- **pgvector** extension for embedding storage and similarity search
- Embeddings stored for: posting descriptions, tags, natural language criteria
- Fast filtering via PostgreSQL indexes, semantic matching via pgvector cosine similarity

### Stage 2: Deep Match — LLM Evaluation (v0.5)

> See [1-text-first.md](1-text-first.md) for the text-first matching philosophy.

For the top ~10–20 candidates from Stages 1–2, an LLM evaluates the full text of both sides for nuanced compatibility that structured data can't capture (communication style, project approach, complementary experience).

**Input to the LLM:**

- Poster's full posting text (markdown)
- Candidate's full profile text (markdown)
- Fast-filter overlap summary (shared skills, time overlap %, distance)
- Calendar overlap data (if available)

**Output from the LLM:**

- Match quality score (0–1)
- Brief explanation of why this is a good/poor match
- Any concerns or caveats

**Multi-role matching:** A posting can describe multiple roles ("Looking for an actor AND a musician"). The LLM identifies distinct roles and matches candidates against each role separately.

**Tiering:** Deep match explanations are a premium feature. Free tier sees scores only.

### AI Input Processing

With the text-first rewrite, matching inputs are now primarily **derived from user text** via LLM extraction, rather than manually entered through forms. The extraction pipeline runs in the background after posting and produces the same structured metadata used by Stages 1–2. Users can correct extraction errors, but the text is never modified by the system.

- LLM extracts structured values from posting/profile text (skills, time, location, category, team size)
- Embeddings generated for semantic fields and stored in pgvector
- Extraction is read-only — a derivation of the text, not a modification of it

---
