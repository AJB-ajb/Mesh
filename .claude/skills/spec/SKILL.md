---
name: spec
description: >
  Navigate, read, create, and update product specifications and technical documentation.
  Covers spec/ (what to build) and docs/ (how it's built). IMPORTANT: Trigger proactively before
  starting implementation of any feature or significant change — read the relevant spec to ensure
  alignment. Also trigger when someone says 'read the spec', 'update the spec', 'write a spec',
  'check the docs', 'update the data model', or 'architecture'.
argument-hint: "[topic or feature name]"
---

# Spec & Docs Navigation

## Two directories, two purposes

| Directory        | Purpose                                                              | Audience                                |
| ---------------- | -------------------------------------------------------------------- | --------------------------------------- |
| `spec/`          | **What to build** — product vision, behavior, roadmap                | Agents + humans                         |
| `docs/`          | **How it's built** — architecture, conventions, data model, services | Agents + humans                         |
| `docs/runbooks/` | **How to operate** — setup guides, deployment, config                | Humans only (never loaded into context) |

## Spec Directory

All specs live in `spec/`. Read `spec/README.md` first for the full index and loading guidance.

### Layers

| Prefix     | Layer        | Purpose                                               | When to update                                            |
| ---------- | ------------ | ----------------------------------------------------- | --------------------------------------------------------- |
| `0-`       | Direction    | Why, for whom, guiding scenarios                      | Rarely — when product vision changes                      |
| `1-`       | Behavior     | How the product should work (target state + insights) | Before code changes for new features                      |
| `2-`       | Roadmap      | What's done, what's next                              | When milestones ship                                      |
| `3-`       | Architecture | Tech stack, libraries, deployment                     | When stack changes                                        |
| `designs/` | Designs      | Per-milestone feature designs (ephemeral)             | Created during planning, folded into Layer 1 when shipped |

### Key Files

| File                   | When to read                                                            |
| ---------------------- | ----------------------------------------------------------------------- |
| `0-foundations.md`     | Coordination theory — definitions, patterns, compressions, social norms |
| `0-vision.md`          | Unsure about product direction, need guiding principles                 |
| `0-use-cases.md`       | Need concrete scenarios to guide design decisions                       |
| `1-mesh.md`            | Product overview, scope, monetization                                   |
| `1-text-first.md`      | Text-first philosophy, `mesh:` syntax, `\|\|hidden\|\|`, data model     |
| `1-ux.md`              | Layout, pages, interaction patterns, voice & tone                       |
| `1-matching.md`        | Matching dimensions, scoring, deep match pipeline                       |
| `1-scheduling.md`      | Scheduling intelligence, time slot generation                           |
| `1-skills.md`          | Skill tree, taxonomy, LLM auto-adding                                   |
| `1-availability.md`    | Calendar sync, availability windows, overlap                            |
| `1-nested-postings.md` | Nesting model, groups, channels, context inheritance                    |
| `1-posting-access.md`  | Composable access model (discover/invite/link/context)                  |
| `1-terminology.md`     | Canonical terms — check here before inventing labels                    |
| `2-roadmap.md`         | Implementation status, milestones, version tracking                     |
| `3-architecture.md`    | Tech stack, key libraries                                               |

## Workflow

### Reading specs (before working on a task)

1. Read `spec/README.md` to get the index
2. Load ONLY the files relevant to your task (see Loading Guidance in README)
3. Within a file, use section headers (`##`) to navigate to the relevant part
4. When unsure about a design decision during implementation, go to Layer 0 (vision + use cases) for guidance

### Updating specs (when implementing features)

1. **Spec-first**: update the relevant Layer 1 spec BEFORE writing code
2. **Target state**: write what is right (the target), not what currently exists
3. **Deviations section**: if the code doesn't match the spec yet, add an entry to `## Current Deviations` at the bottom of the Layer 1 file, linked to a roadmap milestone
4. **When a deviation is resolved**: delete it from the deviations section
5. **Roadmap**: update `2-roadmap.md` when a milestone completes — mark items `[x]`, bump version

### Creating new specs

1. Determine the layer: is this direction (0), behavior (1), or a design doc (designs/)?
2. Use the appropriate numbered prefix: `1-feature-name.md`
3. Start with a one-line scope statement as a blockquote on line 2
4. Follow the content shape that fits (see below)
5. Add the file to the README index table
6. Cross-reference from related specs — never duplicate content

### When NOT to update specs

- Bug fixes (unless the spec itself was wrong)
- Pure refactors (no behavioral change)
- Test-only changes
- Dependency updates (update `3-architecture.md` only if a major tool changes)

## Content Conventions

### Required elements (every spec file)

1. **One-line scope statement** — blockquote on line 2, after the `# Title`
2. **Numbered prefix** — `0-`, `1-`, `2-`, `3-` matching the layer
3. **Clear `##` section headers** — enables selective loading
4. **Layer 1 files: `## Current Deviations` at bottom** (if gaps exist; omit if fully implemented)

### Content shapes (not rigid templates)

**Shape A — Insight-driven** (text-first, posting-access, matching, skills, spaces):

- Lead with "why" / the problem / the insight
- Then "how" — the target design
- Topic-specific sections as needed
- Current Deviations at bottom

**Shape B — Reference** (terminology, availability):

- Brief principles (optional)
- Structured entries: tables, decision logs, schemas
- Current Deviations at bottom

**Shape C — Direction** (vision, use-cases):

- Narrative: insights, scenarios, arguments
- No Current Deviations section — these describe the target world

**Shape D — Analytical** (foundations):

- Definitions, principles, analytical results
- Grounded in brief examples (not full UX walkthroughs)
- No deviations — these describe the problem space, not the implementation

### Writing principles — how to add to specs

**State principles, not history.** When a design decision is made, extract the underlying principle and state it directly. Do NOT document the decision process ("we used to do X, now we do Y because Z"). Instead: "Principle: Y. Example: ..."

**No before/after tables.** These document a transition, not a target state. Once the transition is complete, the "before" column is dead weight. If the new design has a principle worth stating, state the principle.

**No "not X" justifications in definitions.** "Posting (not Project)" is useful once when deciding. After that, the canonical term is just "Posting." Move reasoning to a compressed footnote or delete it. The terminology file should be a lookup table, not a debate transcript.

**Separate semantic models from UX detail.** A spec file's first sections should define the _model_ (what things are, how they compose, what rules govern them). UX detail (wireframes, context bar layouts, form field mappings) goes in a clearly separated lower section or in `1-ux.md`. An agent loading the file for a data model question shouldn't wade through ASCII wireframes.

**One canonical definition per concept.** If `||hidden||` is defined in `1-text-first.md`, other files link to it — they don't re-explain it. A one-line pointer ("see `1-text-first.md` §Hidden Content") replaces re-explanation.

**No Integration Points sections.** The README index and cross-references within sections handle this. A standalone "Integration Points" section at the end of every file is redundant boilerplate.

**Implementation phases belong in Layer 2.** Layer 1 describes target behavior. Implementation sequencing belongs in `2-roadmap.md`. Don't add "Phase 1 / Phase 2 / Phase 3" tables to Layer 1 files.

**Analytical results go in Layer 0.** If you discover a general insight about coordination, social norms, or communication patterns, it belongs in `0-foundations.md` — not embedded in a Layer 1 behavior spec. Layer 1 files can reference foundations ("see §3 Overhead Sources").

### Deviations format

```markdown
## Current Deviations

- **[Gap name]**: Currently X. Target: Y. → v0.N
- **[Feature name]**: Not yet implemented. → v0.N
```

One line per deviation. Each links to a roadmap milestone. When that milestone ships, delete the entry.

## Docs Directory

Technical documentation in `docs/` describes the current implementation — not the target state.

### Agent-facing files (flat in `docs/`)

| File              | When to read                                                 |
| ----------------- | ------------------------------------------------------------ |
| `architecture.md` | System layers, key patterns, critical file paths             |
| `conventions.md`  | Code patterns: DAL, withAuth, SWR, hooks, toasts             |
| `data-model.md`   | DB semantics, relationships, JSONB structures, RPC functions |
| `services.md`     | External service reference table                             |

**`data-model.md` is intentionally lean.** Column types, nullability, defaults, indexes, and RLS
policies are recoverable from `supabase db dump` or `supabase/migrations/`. The doc only captures
what the schema doesn't tell you: semantic meaning, JSONB types, relationship overview, RPC logic.

### Human-only files (`docs/runbooks/`)

Setup guides, deployment, config. Never loaded into agent context:
`capacitor-android.md`, `mcp-setup.md`, `setup-google-cloud.md`, `setup-sentry.md`,
`setup-supabase.md`, `vercel-deployment.md`

### Updating docs

- Update `docs/data-model.md` after any migration that adds semantic meaning (new JSONB structures,
  dual-purpose fields, non-obvious constraints). Don't document plain column additions — the schema
  speaks for itself.
- Update `docs/architecture.md` when adding new system layers or changing core patterns.
- Update `docs/conventions.md` when establishing new code patterns that should be followed project-wide.

## Token Efficiency

- Use tables over prose for reference data
- Insight/philosophy sections can be narrative
- Don't duplicate content — cross-reference with `[file](file.md)`
- Scope statements enable fast scanning without reading the full file
- Prefer recoverable-from-source over documented: don't repeat what `\d tablename` or the code itself shows
