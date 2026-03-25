---
name: spec-audit
description: >
  Compare specifications against the actual implementation to find gaps, stale deviations, broken use cases,
  and roadmap drift. Prioritizes by user impact. Updates spec deviations, roadmap status, and docs.
  Use when someone says 'audit the spec', 'spec audit', 'what's implemented', 'what's missing',
  'check use cases', 'spec vs code', 'update deviations', 'what works', 'what doesn't work yet',
  or 'compare spec to implementation'.
argument-hint: "[focus area] (e.g. 'scheduling', 'cards', 'use cases', 'full')"
---

# Spec Audit

Compare what the specs say should exist against what actually exists in the codebase. Surface the most important gaps, stale documentation, and broken use cases.

## 1. Determine Scope

Parse `$ARGUMENTS`:

| Value                                              | Meaning                                                                               |
| -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `full` or empty                                    | Audit all Layer 1 specs, use cases, and roadmap                                       |
| A spec area (e.g. `scheduling`, `cards`, `spaces`) | Focus on the relevant `1-*.md` file(s) and related use cases                          |
| `use cases`                                        | Focus on `0-use-cases.md` flows — which ones work end-to-end?                         |
| `roadmap`                                          | Focus on `2-roadmap.md` — verify checked items are real, unchecked items are accurate |
| `deviations`                                       | Focus on `## Current Deviations` sections across all Layer 1 files                    |

## 2. Gather Context

### Read specs

Load the relevant spec files based on scope. For a full audit, read:

1. `spec/0-use-cases.md` — the canonical user scenarios
2. `spec/2-roadmap.md` — what claims to be done/remaining
3. All `spec/1-*.md` files — target behavior and their `## Current Deviations` sections
4. Active `spec/designs/*.md` files — current milestone designs

### Read the codebase

For each spec area being audited, verify claims against the actual code:

- **Routes**: `Glob pattern="src/app/**/page.tsx"` — what pages exist?
- **API routes**: `Glob pattern="src/app/api/**/route.ts"` — what endpoints exist?
- **Components**: Search for key components mentioned in specs
- **Database**: Check `supabase/migrations/` for tables, columns, RLS policies mentioned in specs
- **Hooks/lib**: Search for key functions (e.g. matching pipeline, calendar overlap, card detection)

Use targeted searches — don't read every file. Focus on verifying specific claims from the specs.

## 3. Audit

Work through each area systematically. For each spec claim, determine:

### A. Roadmap Accuracy

- **Checked items that aren't actually done**: Features marked `[x]` in the roadmap but missing or incomplete in code
- **Unchecked items that are actually done**: Features in "Remaining" sections that have been implemented
- **Missing items**: Implemented features not tracked in the roadmap at all

### B. Deviation Freshness

For each `## Current Deviations` entry in Layer 1 files:

- **Stale deviations**: Listed as gaps but actually implemented (should be deleted)
- **Missing deviations**: Spec describes target behavior that isn't implemented, but no deviation entry exists
- **Wrong milestone links**: Deviations pointing to the wrong `-> v0.N`

### C. Use Case Feasibility

For each use case in `0-use-cases.md`, assess:

- **Fully working**: All steps in the flow are implementable with current code
- **Partially working**: Core flow works but specific features are missing (e.g. calendar integration exists but `||hidden||` doesn't)
- **Not yet possible**: Key infrastructure is missing

Prioritize by **user impact** — which broken use cases affect the most common real-world scenarios?

### D. Spec-Code Mismatches

Look for cases where the code does something different from what the spec describes, even if both are "working." These are the trickiest bugs — the feature exists but behaves incorrectly per spec.

### E. Spec Quality

Check each spec file for writing quality issues (see `/spec` § Writing principles):

- **Design archaeology**: before/after tables, "not X" justifications, "we used to" history. These should be replaced with the principle they encode, or deleted.
- **UX mixed into semantic models**: wireframes, context bar layouts, form field migration tables in the same section as data model or access model definitions. These should be separated.
- **Duplicated concepts**: the same concept explained in multiple files instead of one canonical definition + cross-references.
- **Integration Points boilerplate**: standalone "Integration Points" sections that just list cross-references — redundant with the README index.
- **Implementation phases in Layer 1**: phase tables that belong in `2-roadmap.md`, not in behavior specs.
- **Missing foundations references**: insights about coordination, social norms, or communication patterns buried in Layer 1 files that should be in or reference `0-foundations.md`.

## 4. Report

Present findings in this structure:

```markdown
# Spec Audit Report — YYYY-MM-DD

## Summary

- **Scope**: [what was audited]
- **Stale deviations found**: N (specs say "not implemented" but it is)
- **Missing deviations found**: N (spec target not met, no deviation listed)
- **Roadmap items to update**: N
- **Use cases fully working**: N / total
- **Use cases partially working**: N / total
- **Use cases not yet possible**: N / total

## Critical Gaps (High User Impact)

Things that matter most — core use cases that don't work or work incorrectly.

### GAP-001: [Short description]

- **Spec**: [what the spec says]
- **Reality**: [what the code does]
- **Impact**: [which use cases are affected]
- **Roadmap**: [which milestone this falls under]

## Stale Deviations (Ready to Remove)

Deviations listed in specs that are now implemented and should be deleted.

| File | Deviation | Status |
| ---- | --------- | ------ |

## Missing Deviations (Should Be Added)

Spec targets not yet met that lack a deviation entry.

| File | Gap | Suggested entry |
| ---- | --- | --------------- |

## Roadmap Updates Needed

| Section | Item | Issue |
| ------- | ---- | ----- |

## Use Case Status

| Use Case   | Status  | Missing Features |
| ---------- | ------- | ---------------- | --- | ------ | --- | ---------------------------- |
| Coffee Now | Partial | No `             |     | hidden |     | `, no calendar pre-filtering |
| ...        | ...     | ...              |

## Spec Quality Issues

| File | Issue type | Description | Suggested fix |
| ---- | ---------- | ----------- | ------------- |
```

## 5. Apply Updates

After presenting the report, ask the user which updates to apply. Then use `/spec` to make the changes — it has the conventions for reading, editing, and creating spec files (deviations format, content shapes, cross-referencing rules). Follow its workflow section.

Key updates:

1. **Delete stale deviations** from `1-*.md` files
2. **Add missing deviations** in the standard format (see `/spec` § Deviations format)
3. **Update roadmap** (`2-roadmap.md`): move completed items to "Done", fix checked/unchecked status
4. **Update docs** if the audit revealed doc drift (e.g. `docs/data-model.md` missing new tables)

### What NOT to update

- Don't change Layer 0 files (`0-vision.md`, `0-use-cases.md`) — these describe the target world
- Don't change spec target behavior to match current code — specs describe what's right, deviations track the gap
- Don't create issues or PRs — just update the docs and report findings

## 6. Priority Framework

When reporting, order findings by user impact:

1. **Core flow broken**: A canonical use case from `0-use-cases.md` fails entirely
2. **Core flow degraded**: A use case works but key Mesh differentiators (calendar intelligence, `||hidden||`, card suggestions) are missing
3. **Spec drift**: Code works but doesn't match spec (could cause future bugs or confusion)
4. **Documentation debt**: Stale deviations, wrong roadmap status (cosmetic but causes planning errors)
