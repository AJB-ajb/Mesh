---
name: spec
description: >
  Navigate, read, create, and update product specifications. Encodes the layered spec structure
  (direction, behavior, roadmap, architecture), file conventions, and the spec-first workflow.
  Use when someone says 'read the spec', 'update the spec', 'write a spec', 'create a spec',
  'spec for [feature]', 'check the spec', or when starting work on a new feature that needs
  spec context.
argument-hint: "[topic or feature name]"
---

# Spec Navigation & Authoring

## Spec Directory Structure

All specs live in `spec/`. Read `spec/README.md` first for the full index and loading guidance.

### Layers

| Prefix | Layer | Purpose | When to update |
|--------|-------|---------|----------------|
| `0-` | Direction | Why, for whom, guiding scenarios | Rarely — when product vision changes |
| `1-` | Behavior | How the product should work (target state + insights) | Before code changes for new features |
| `2-` | Roadmap | What's done, what's next | When milestones ship |
| `3-` | Architecture | Tech stack, libraries, deployment | When stack changes |
| `designs/` | Designs | Per-milestone feature designs (ephemeral) | Created during planning, folded into Layer 1 when shipped |

### Key Files

| File | When to read |
|------|-------------|
| `0-vision.md` | Unsure about product direction, need guiding principles |
| `0-use-cases.md` | Need concrete scenarios to guide design decisions |
| `1-mesh.md` | Product overview, scope, monetization |
| `1-text-first.md` | Text-first philosophy, `mesh:` syntax, `\|\|hidden\|\|`, data model |
| `1-ux.md` | Layout, pages, interaction patterns, voice & tone |
| `1-matching.md` | Matching dimensions, scoring, deep match pipeline |
| `1-scheduling.md` | Scheduling intelligence, time slot generation |
| `1-skills.md` | Skill tree, taxonomy, LLM auto-adding |
| `1-availability.md` | Calendar sync, availability windows, overlap |
| `1-nested-postings.md` | Nesting model, groups, channels, context inheritance |
| `1-posting-access.md` | Composable access model (discover/invite/link/context) |
| `1-terminology.md` | Canonical terms — check here before inventing labels |
| `2-roadmap.md` | Implementation status, milestones, version tracking |
| `3-architecture.md` | Tech stack, key libraries |

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

**Shape A — Insight-driven** (text-first, nested-postings, posting-access, matching, skills):
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

### Deviations format

```markdown
## Current Deviations

- **[Gap name]**: Currently X. Target: Y. -> v0.N
- **[Feature name]**: Not yet implemented. -> v0.N
```

Each entry links to a roadmap milestone. When that milestone ships, delete the entry.

## Token Efficiency

- Use tables over prose for reference data
- Insight/philosophy sections can be narrative
- Don't duplicate content — cross-reference with `[file](file.md)`
- Scope statements enable fast scanning without reading the full file
