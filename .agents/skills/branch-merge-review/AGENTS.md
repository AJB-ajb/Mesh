# branch-merge-review

## Overview

PR and merge review skill for Mesh. Focused on catching integration issues from parallel branch development. Includes issue management (close/update/create issues based on merge outcomes).

## Structure

```
branch-merge-review/
  SKILL.md       # Main skill — review process, checklist, report format
  AGENTS.md      # This navigation guide
  CLAUDE.md      # Symlink to AGENTS.md
  rules/         # Detection guidance per merge risk area
```

## Usage

1. Read `SKILL.md` for the full review process (4 phases)
2. Work through `rules/` for each risk area
3. Use the report format from SKILL.md for review comments
4. Update GitHub issues per `merge-issue-tracking` rule

## Available Rules

**Merge Risks**:

- `rules/merge-file-conflicts.md` — Logically conflicting changes to same files
- `rules/merge-migration-order.md` — Supabase migration timestamp/dependency issues
- `rules/merge-duplicate-features.md` — Same feature implemented twice
- `rules/merge-broken-refs.md` — Broken imports, links, config references

**Post-Merge**:

- `rules/merge-issue-tracking.md` — Issue close/update/create after merge
- `rules/merge-test-coverage.md` — Test coverage gaps in merged code

---

_6 rules across 2 categories_
