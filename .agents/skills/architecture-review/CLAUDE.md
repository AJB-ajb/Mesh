# architecture-review

## Overview

Mesh-specific codebase health check. Scans for duplicated code, anti-patterns, complexity hotspots, and inconsistencies across the Next.js + Supabase + SWR stack.

## Structure

```
architecture-review/
  SKILL.md       # Main skill — checklist, categories, output format
  AGENTS.md      # This navigation guide
  CLAUDE.md      # Symlink to AGENTS.md
  rules/         # Detection and fix guidance per pattern
```

## Usage

1. Read `SKILL.md` for the full review checklist
2. Browse `rules/` for detailed detection + fix guidance per pattern
3. Run checks against the codebase, report findings per the output format in SKILL.md

## Available Rules

**Duplication** (`dup-`):

- `rules/dup-json-parsing.md` — Repeated JSON body parsing in API routes

**Error Handling** (`err-`):

- `rules/err-fire-and-forget.md` — Fetch calls without error handling
- `rules/err-silent-catch.md` — Empty catch blocks
- `rules/err-response-format.md` — Inconsistent API error formats

**Supabase** (`supa-`):

- `rules/supa-client-instances.md` — Multiple client instances per component

**SWR & Data Fetching** (`swr-`):

- `rules/swr-missing-revalidate.md` — Mutations without cache revalidation
- `rules/swr-n-plus-one.md` — N+1 query patterns in hooks

**Performance** (`perf-`):

- `rules/perf-select-star.md` — SELECT \* on tables with large columns

**Type Safety** (`type-`):

- `rules/type-generic-json.md` — Generic Json type for structured JSONB

**Components** (`comp-`):

- `rules/comp-too-large.md` — Components exceeding 300 lines
- `rules/comp-error-boundary.md` — Missing error boundaries

---

_11 rules across 6 categories_
