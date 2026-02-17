# Skills

## Overview

Skills in Mesh are organized as a **tree** — a hierarchy where each skill has exactly one parent. The tree enables hierarchical filtering (search "Music" → find Piano, Guitar, etc.), consistent skill naming, and meaningful skill-level matching per domain.

The tree is **LLM-maintained**: new skills are added automatically following clear guidelines, while structural reorganization uses a more capable model with human oversight.

See [matching.md](matching.md) for how skill levels feed into compatibility scoring.

### Why a Tree (not a DAG)

A tree is simpler than a directed acyclic graph and captures the primary "implies knowledge" relationship for ~90% of skills. The key semantic property: **knowing a leaf skill implies knowledge of its ancestors** (knows Django → knows Python → knows Programming).

Cross-cutting skills (e.g., Next.js implies both React and Node.js) exist, but are handled pragmatically:

- The tree captures the **primary** implication (Next.js → React)
- Secondary relationships are covered by users tagging multiple skills from different branches
- Embedding-based semantic matching (already in place) handles fuzzy relatedness

The tree's main advantage: **LLM placement is unambiguous**. "Pick the single most important parent" is a clearer instruction than "decide how many parents this skill should have."

## Motivation

- **No normalization today**: "React", "react", "ReactJS" used to be all separate skills. Users type free-form text, leading to inconsistency and poor filterability.
- **No hierarchy**: Searching "Programming" doesn't surface Python or Next.js postings. Users can only match on exact skill strings.
- **Coarse skill levels**: Postings have one `skill_level_min` for the whole posting. "Needs Advanced Python but Beginner Docker is fine" can't be expressed.
- **Diverse domains**: Mesh serves music, theater, programming, social activities, etc. A flat list doesn't scale across these domains.

## Design Principles

- **Transparent classification**: Hard filters and clear categories are more trustworthy to users than opaque AI similarity.
- **LLM-maintained, human-governed**: LLMs handle the high-volume, low-risk work (adding leaf nodes, normalizing input). Humans handle the rare, high-impact work (restructuring the backbone).
- **Graceful degradation**: If a skill isn't in the tree yet, it still works — the LLM adds it on the fly. No blocking on taxonomy completeness.
- **Top-down seed, bottom-up growth**: The initial tree is hand-crafted for the top 2-3 levels. The long tail of specific skills grows organically as users bring real data.
- **Leaf implies ancestor**: The tree is structured so that knowing a leaf skill implies knowledge of its parent chain. This guides both seed design and LLM placement.

---

## Data Model

### Skill Node

Each node in the tree represents a recognizable, searchable skill or skill category.

| Field         | Type         | Description                                                             |
| ------------- | ------------ | ----------------------------------------------------------------------- |
| `id`          | uuid         | Primary key                                                             |
| `parent_id`   | uuid \| null | FK → skill_nodes.id (null for root nodes)                               |
| `name`        | text         | Canonical display name (e.g., "React")                                  |
| `aliases`     | text[]       | Alternative names that map to this node (e.g., ["ReactJS", "React.js"]) |
| `description` | text \| null | Optional short description for disambiguation                           |
| `depth`       | integer      | Distance from root (computed, for query optimization)                   |
| `is_leaf`     | boolean      | Whether users can directly tag this skill (vs. internal grouping node)  |
| `created_by`  | text         | `seed`, `llm`, or `admin`                                               |
| `created_at`  | timestamptz  |                                                                         |

No separate edges table — the tree structure is encoded directly via `parent_id`. This is simpler to query, index, and reason about.

### Indexes

- `UNIQUE(parent_id, name)` — no duplicate siblings
- `GIN` index on `aliases` — fast alias lookup
- Index on `parent_id` — fast child lookups for subtree queries

### Skill Aliases

A unique index on `(lower(alias))` across all nodes (flattened from the `aliases` arrays) enables fast normalization: "does this string already exist in the tree?"

---

## LLM Auto-Adding

When a user inputs a skill (on a profile or posting), the system checks if it maps to an existing tree node. If not, the LLM adds it.

### Flow

1. User types a skill string (e.g., "svelte")
2. System checks name + normalized aliases → no match found
3. LLM receives: the skill string, the relevant subtree of the tree, and the guidelines below
4. LLM outputs: `{ action: "add", name: "Svelte", parent: "JavaScript", aliases: ["SvelteJS"] }` or `{ action: "map", existing_node_id: "..." }`
5. New node is created as a child of the specified parent and immediately available

### Guidelines (provided to the LLM)

These rules define what the LLM can and cannot do when adding skills:

**What constitutes a valid node:**

- A recognizable skill that someone would reasonably search for or filter by
- Specific enough to be meaningful: "Python" yes, "Scripting Languages" only as a grouping node
- Not too specific: "Python" yes, "Python 3.12.4" no. "Jazz" yes, "Jazz played on Tuesdays" no
- Not a sentence or description: "React" yes, "Experience building React apps" no

**Placement rule — "implies knowledge" test:**

- Pick the single parent where the implication "knows X → knows [parent]" is **strongest**
- Examples:
  - Django → Python ✓ (knowing Django implies knowing Python)
  - React → JavaScript ✓
  - Next.js → React ✓ (primary implication; Node.js is secondary)
  - PostgreSQL → SQL ✓
- When multiple parents seem valid, pick the one that represents the **most direct prerequisite**
- Don't create intermediate grouping nodes — only add the requested skill as a leaf
- Maximum depth: 5 levels from root

**Naming rules:**

- Use the most widely recognized name: "React" not "React.js" or "ReactJS"
- Include common alternatives as aliases
- Use title case for multi-word names: "Machine Learning", "Game Development"

**Before adding, always check:**

- Does a node with this name or a similar alias already exist? → Map to it instead
- Is this actually a synonym for an existing node? → Add as alias, don't create new node
- Could this be a typo of an existing node? → Ask for confirmation or map to closest match

---

## LLM Restructuring (with Human Oversight)

Structural changes to the tree — merging nodes, splitting categories, moving branches — are proposed by a more capable LLM and reviewed by an admin.

### Triggers

- A node has accumulated too many direct children (e.g., >20 leaf nodes under one parent — consider adding grouping subcategories)
- Admin-initiated review ("reorganize the Music subtree")
- Periodic review (e.g., monthly)

### Process

1. LLM analyzes the subtree and proposes changes as a diff:
   - "Split 'Programming' children into subcategories 'Languages', 'Frameworks', 'Tools'"
   - "Merge 'ReactJS' and 'React' nodes (keep 'React', add alias)"
   - "Move 'Data Visualization' from 'Design' to 'Data Science'"
2. Diff is presented to admin in a review UI
3. Admin approves, modifies, or rejects
4. Approved changes are applied atomically

### Constraints

- Node IDs are stable — restructuring changes `parent_id`, not node identity
- Existing references (profile skills, posting skills) remain valid through restructuring
- Restructuring never deletes a skill node that's in use — only moves or merges it

---

## Seed Taxonomy

The initial tree is hand-crafted for the top 2-3 levels. Structured so that **leaf implies ancestor** holds throughout.

Nodes marked with `*` are **grouping nodes** (not directly taggable by users — they exist for tree structure and browsing). All other nodes are taggable.

```
Technology *
├── Programming *
│   ├── Python
│   │   ├── Django
│   │   ├── Flask
│   │   └── FastAPI
│   ├── JavaScript
│   │   ├── React
│   │   │   ├── Next.js
│   │   │   └── React Native
│   │   ├── Vue
│   │   ├── Node.js
│   │   │   ├── Express
│   │   │   └── NestJS
│   │   └── Svelte
│   ├── TypeScript
│   ├── Java
│   │   └── Spring
│   ├── C/C++
│   ├── Rust
│   ├── Go
│   ├── SQL
│   │   ├── PostgreSQL
│   │   └── MySQL
│   ├── Data Science *
│   │   ├── Machine Learning
│   │   ├── Data Engineering
│   │   └── Data Visualization
│   ├── DevOps *
│   │   ├── Docker
│   │   ├── Kubernetes
│   │   └── CI/CD
│   ├── Mobile Development *
│   └── Game Development
├── Design *
│   ├── UI/UX Design
│   ├── Graphic Design
│   └── 3D Modeling
└── Hardware *
    ├── Electronics
    └── Robotics

Music *
├── Instruments *
│   ├── Piano
│   ├── Guitar
│   │   ├── Classical Guitar
│   │   ├── Electric Guitar
│   │   └── Bass Guitar
│   ├── Drums
│   ├── Violin
│   └── Voice / Vocals
├── Music Production
│   ├── Mixing
│   ├── Mastering
│   └── Sound Design
└── Music Theory
    ├── Composition
    └── Harmony

Performing Arts *
├── Acting
├── Directing
├── Stagecraft
├── Dance
├── Comedy
│   ├── Stand-up
│   └── Improv
└── Film / Video

Visual Arts *
├── Drawing
├── Painting
├── Photography
├── Sculpture
└── Digital Art

Writing *
├── Creative Writing
├── Technical Writing
├── Journalism
└── Copywriting

Languages *
├── English
├── German
├── Spanish
├── French
├── Mandarin
├── Japanese
└── ...

Communication *
├── Public Speaking
├── Negotiation
├── Debate
├── Presentation
└── Conversation Practice

Management *
├── Project Management
├── Team Leadership
└── Product Management

Sports & Fitness *
├── Team Sports *
│   ├── Football
│   ├── Basketball
│   └── Volleyball
├── Individual Sports *
│   ├── Tennis
│   ├── Running
│   └── Swimming
├── Martial Arts
└── Yoga / Pilates

Academic *
├── Natural Sciences *
│   ├── Physics
│   ├── Chemistry
│   └── Biology
├── Mathematics
│   ├── Statistics
│   └── Linear Algebra
├── Social Sciences *
│   ├── Psychology
│   ├── Economics
│   └── Sociology
└── Humanities *
    ├── Philosophy
    └── History

Games *
├── Board Games
│   ├── Chess
│   ├── Go
│   └── Strategy Games
├── Card Games
│   └── Poker
└── Puzzle Games

Culinary *
├── Cooking
├── Pastry / Baking
├── Fermentation
└── Bartending
```

### "Implies knowledge" validation for key paths

| Leaf             | → Parent         | → Grandparent | Holds?                                              |
| ---------------- | ---------------- | ------------- | --------------------------------------------------- |
| Django           | Python           | Programming   | ✓ Knowing Django implies knowing Python             |
| Next.js          | React            | JavaScript    | ✓ Knowing Next.js implies knowing React             |
| Express          | Node.js          | JavaScript    | ✓ Knowing Express implies knowing Node.js           |
| PostgreSQL       | SQL              | Programming   | ✓ Knowing PostgreSQL implies knowing SQL            |
| Classical Guitar | Guitar           | Instruments   | ✓ Knowing classical guitar implies knowing guitar   |
| Mixing           | Music Production | Music         | ✓ Knowing mixing implies music production knowledge |
| Statistics       | Mathematics      | Academic      | ✓ Knowing statistics implies math knowledge         |

### Notable placement decisions

- **TypeScript** is a sibling of JavaScript (not a child), because TypeScript is its own language — though it implies JS knowledge, it has distinct features and ecosystem. Users who know TypeScript will typically also tag JavaScript.
- **React Native** is under React (not Mobile Development), because the primary prerequisite is React knowledge. Users doing mobile work will also tag Mobile Development.
- **Data Science**, **DevOps**, **Mobile Development** are grouping nodes under Programming — they're broad areas, not individual skills.
- **Music genres** (Jazz, Classical, etc.) are omitted from the tree — they're better modeled as **tags or interests**, not skills. "Knows Jazz" doesn't imply a learnable skill the way "knows Piano" does.
- **"Social" was dissolved** — Board Games, Cooking, Travel, Volunteering aren't a coherent skill domain. Travel and Volunteering are activities, not skills — handled by posting categories and tags. Board Games moved to **Games** (chess, go, strategy games are genuine skills). Cooking moved to **Culinary** (a real skill domain with clear hierarchy).
- **"Business & Professional" was dissolved** — it failed the "implies knowledge" test. Negotiation and Public Speaking are communication skills, not business skills. Marketing and Finance are domain knowledge, not clear semantic skills. The contents were redistributed:
  - Negotiation, Public Speaking, Conversation Practice → **Communication**
  - Project Management → **Management**
  - Entrepreneurship, Marketing, Finance → removed (not clear semantic skills; can be added as tags/interests or re-added later if demand warrants)

---

## Integration with Existing Systems

### Profile Skills

Currently: `skills: text[]` (free-form) + `skill_levels: jsonb` (domain → 0-10)

**Migration:**

- `skills` array entries are mapped to tree node IDs via LLM normalization
- `skill_levels` domain names are mapped to tree node IDs
- A new `profile_skills` join table replaces the denormalized arrays:

| Field        | Type            | Description               |
| ------------ | --------------- | ------------------------- |
| `profile_id` | uuid            | FK → profiles.user_id     |
| `skill_id`   | uuid            | FK → skill_nodes.id       |
| `level`      | integer \| null | 0-10, null if unspecified |

This enables per-skill levels on profiles (already the case with `skill_levels`, but now normalized).

### Posting Skills

Currently: `skills: text[]` + `skill_level_min: integer`

**Migration:**

- `skills` entries mapped to tree node IDs
- Per-skill level requirements replace the single `skill_level_min`:

| Field        | Type            | Description                            |
| ------------ | --------------- | -------------------------------------- |
| `posting_id` | uuid            | FK → postings.id                       |
| `skill_id`   | uuid            | FK → skill_nodes.id                    |
| `level_min`  | integer \| null | 0-10 minimum, null = any level welcome |

### Filtering

Tree-aware filtering means selecting a parent node includes all descendants:

- User filters by "Programming" → matches postings tagged with Python, JavaScript, React, etc.
- Implemented via recursive CTE: simple, performant at tree sizes of ~2,000 nodes with depth ≤ 5

### Matching

Skill-level scoring becomes per-skill instead of averaged:

- For each skill required by the posting, find the user's level for that skill (or infer from ancestors in the tree)
- Score per skill: `1 - |user_level - required_level| / 10`
- Aggregate: average across required skills (or minimum, TBD)

The hierarchical inference mentioned in [matching.md](matching.md) ("extrapolates missing levels if necessary") becomes implementable: if a user has "Programming: 7" but no "Python" level, walk down the tree and infer Python ≈ 7 (discounted by depth distance).

---

## UI Changes

### Skill Input (Profiles & Postings)

Replace the free-form comma-separated text input with a **searchable skill picker**:

- Typeahead that searches tree node names and aliases
- Shows the skill's ancestry as a breadcrumb (Technology → Programming → Python)
- "Add custom skill" option that triggers LLM auto-adding if no match found
- Selected skills shown as removable badge pills (existing pattern)

### Skill Level Input (Profiles)

Current slider UI stays, but now each slider is attached to a tree node instead of a free-form domain name. Adding a skill via the picker automatically creates a level slider for it.

### Posting Skill Requirements

Replace single `skill_level_min` with per-skill level requirements:

- Each required skill gets an optional level slider
- "Any level welcome" is the default (null)

### Filtering / Browse

- Hierarchical skill filter on the postings page: expandable tree or search within it
- Selecting a parent node includes all descendants
- Can combine with existing NL filter, category chips, etc.

---

## Skill Proxies (Future)

Different domains use different evidence for skill level:

- Programming: years of experience, portfolio, GitHub activity
- Music: pieces played, instruments mastered, performances
- Academic: publications, courses completed

These are **not in scope for the initial implementation** but the data model supports them — each skill node could later have a `proxy_template` field describing what evidence is relevant for that domain. The existing GitHub integration already serves as a proxy for programming skills.

---

## Migration Plan

1. **Create skill_nodes table** and seed the initial taxonomy
2. **Build LLM auto-adding pipeline** — normalize existing free-form skills to tree nodes
3. **Migrate existing data** — batch-process all profile and posting skills through the normalization pipeline, create join table entries
4. **Build skill picker UI** — replace free-form inputs
5. **Update filtering** — tree-aware descendant matching
6. **Update matching scoring** — per-skill level comparison
7. **Deprecate old columns** — remove `skills: text[]` and `skill_level_min: integer` after migration is verified

Steps 1-3 can be done without UI changes (backward compatible). Steps 4-7 are the user-facing rollout.

---

## Open Questions

- **Confidence threshold for auto-adding**: Should the LLM have a confidence score, with low-confidence additions flagged for review?
- **Community suggestions**: Should users be able to propose new skills or corrections to the taxonomy? (e.g., "React Native should be under Mobile Development instead")
- **Skill deprecation**: How to handle skills that become obsolete (e.g., "Flash", "jQuery")? Archive vs. remove?
- **Scoring aggregation**: When a posting requires multiple skills, should the match score be the average or the minimum of per-skill scores? Minimum penalizes gaps more heavily.
- **Genres / interests**: Music genres, sports types, etc. — are these skills or a separate "interests" dimension? The tree omits them for now; they may belong in a tag system instead.
