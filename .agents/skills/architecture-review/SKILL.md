---
name: architecture-review
description: Scans Mesh codebase for duplicated code, bad patterns, complexity hotspots, and inconsistencies. Run periodically or before major releases. Produces actionable findings with severity and file locations.
metadata:
  version: "1.0.0"
  scope: Mesh-specific
---

# Architecture Review

Codebase health check for Mesh. Detects duplicated code, anti-patterns, complexity, and inconsistencies across the Next.js + Supabase + SWR stack.

## When to Run

- Before major releases or deploys
- After merging parallel branches
- When debugging unexplained bugs
- Periodically (weekly/biweekly)

## How to Use

1. Read this file for the checklist and categories
2. For each category, scan the relevant files using the patterns described
3. Check individual `rules/` files for detailed detection guidance
4. Report findings as: `AREA > FILE(S) > SEVERITY > RECOMMENDATION`

## Review Checklist

### 1. Duplication (CRITICAL)

Scan for repeated code blocks that should be extracted to shared utilities.

| Pattern                       | Where to check               | Rule                   |
| ----------------------------- | ---------------------------- | ---------------------- |
| JSON body parsing boilerplate | `src/app/api/**/route.ts`    | `dup-json-parsing`     |
| Provider identity checking    | hooks + API routes           | `dup-provider-check`   |
| Record transformation logic   | API routes returning DB rows | `dup-record-transform` |

### 2. Error Handling (HIGH)

| Pattern                            | Where to check            | Rule                    |
| ---------------------------------- | ------------------------- | ----------------------- |
| Fire-and-forget fetch calls        | hooks, components         | `err-fire-and-forget`   |
| Silent `.catch(() => {})`          | entire `src/`             | `err-silent-catch`      |
| Unhandled promise rejections       | components with `.then()` | `err-unhandled-promise` |
| Inconsistent error response format | API routes                | `err-response-format`   |

### 3. Supabase Client (HIGH)

| Pattern                                    | Where to check                    | Rule                    |
| ------------------------------------------ | --------------------------------- | ----------------------- |
| Multiple client instances in one component | components with `createClient()`  | `supa-client-instances` |
| Server/browser client confusion            | hooks importing from wrong module | `supa-client-boundary`  |
| Missing null checks after type casting     | API routes with `as Record<>`     | `supa-unsafe-cast`      |

### 4. SWR & Data Fetching (MEDIUM)

| Pattern                                   | Where to check                        | Rule                     |
| ----------------------------------------- | ------------------------------------- | ------------------------ |
| Missing revalidation after mutations      | hooks with `.update()` or `.insert()` | `swr-missing-revalidate` |
| N+1 query patterns                        | hooks fetching per-item in loops      | `swr-n-plus-one`         |
| `select("*")` instead of specific columns | API routes + hooks                    | `perf-select-star`       |

### 5. Type Safety (MEDIUM)

| Pattern                                   | Where to check                     | Rule                 |
| ----------------------------------------- | ---------------------------------- | -------------------- |
| Generic `Json` type for structured data   | `src/lib/supabase/types.ts`, hooks | `type-generic-json`  |
| Explicit `: any` usage                    | entire `src/`                      | `type-any`           |
| Unsafe type assertions without validation | API routes, components             | `type-unsafe-assert` |

### 6. Component Structure (MEDIUM)

| Pattern                               | Where to check           | Rule                      |
| ------------------------------------- | ------------------------ | ------------------------- |
| Components over 300 lines             | `src/components/`        | `comp-too-large`          |
| Missing error boundaries              | route layouts, dashboard | `comp-error-boundary`     |
| Mixed fetch patterns (hook vs direct) | components               | `comp-inconsistent-fetch` |

## Severity Guide

- **CRITICAL**: Causes bugs, data loss, or security issues. Fix immediately.
- **HIGH**: Creates maintenance burden or silent failures. Fix this sprint.
- **MEDIUM**: Inconsistency or code smell. Fix when touching the file.
- **LOW**: Style/preference. Fix opportunistically.

## Output Format

```
## Architecture Review - [date]

### Findings

1. **[SEVERITY] [AREA]**: [description]
   - Files: [file paths with line numbers]
   - Recommendation: [what to do]

### Summary
- Critical: N
- High: N
- Medium: N
- Quick wins: [list easy fixes]
```
