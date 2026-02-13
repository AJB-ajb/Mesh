# staleness-check

## Overview

Periodic health check for repo freshness. Detects stale docs, orphaned issues, dead branches, and structural drift.

## Structure

```
staleness-check/
  SKILL.md       # Main skill — checklist, output format
  AGENTS.md      # This navigation guide
  CLAUDE.md      # Symlink to AGENTS.md
  rules/         # Detection guidance per staleness area
```

## Usage

1. Read `SKILL.md` for the full checklist (4 areas)
2. Work through each `rules/` file for detection commands and actions
3. Output a Staleness Report per the format in SKILL.md

## Available Rules

- `rules/stale-docs.md` — Documentation files referencing removed code/features
- `rules/stale-issues.md` — Open issues that are resolved, outdated, or need updating
- `rules/stale-branches.md` — Merged, abandoned, or stale remote branches
- `rules/stale-structure.md` — Empty dirs, orphaned files, config drift

---

_4 rules across 4 categories_
