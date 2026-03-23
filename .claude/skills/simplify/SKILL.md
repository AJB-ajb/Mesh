---
name: simplify
description: >
  Review changed code for reuse, quality, and efficiency, then fix any issues found.
  Tuned for AI-agentic codebases where code is written across many independent sessions.
  Detects near-duplication, pattern drift, inconsistent conventions, and orphaned code.
  IMPORTANT: Trigger proactively after completing any feature implementation or bug fix
  that touches multiple files. Also trigger when someone says 'simplify', 'clean up',
  'deduplicate', 'unify patterns', 'consolidate', or 'review code quality'.
argument-hint: "[scope] — 'changed' (default: review branch diff), 'broad <area>' (scan area), or file paths"
---

# Simplify — AI-Agentic Codebase Health Review

## Why this exists

When AI agents write code across many sessions, each session solves problems locally without global awareness. The result: near-duplicate implementations, inconsistent patterns, convention drift, and orphaned code. These compound silently. This skill finds and fixes them.

## Anti-Pattern Catalog

These are the specific issues to hunt for, ordered by typical impact:

### 1. Near-Duplication

Similar code in different files — not exact copies, but structurally identical with minor variations. AI agents reinvent rather than reuse because they don't search broadly enough.

**What to look for:**

- Components with the same structure, props shape, and styling but different names
- Utility functions doing the same transformation in different modules
- API route handlers with identical auth/validation/error boilerplate
- Data access functions with the same query pattern (e.g., `if (error?.code === "PGRST116") return null`)
- Hooks that wrap the same Supabase query with slightly different error handling

**Fix pattern:** Extract shared logic into a single utility, component, or higher-order function. The variations become parameters or props.

### 2. Pattern Inconsistency

The same problem solved 2-3 different ways across the codebase. Each is valid; the inconsistency is the problem.

**What to look for:**

- Error handling: `throw new AppError()` vs `return apiError()` vs `return NextResponse.json({error}, {status})`
- Data fetching: SWR with Supabase fetcher vs SWR with API fetcher vs useEffect+useState
- Null handling: `PGRST116` check in some data functions but not others
- Logging: prefixed `console.error("[module]")` vs bare `console.error()` vs no logging
- Validation: Zod schemas vs manual checks vs no validation

**Fix pattern:** Pick the best existing pattern, document it if not already in `.AGENTS.md`, and migrate the outliers.

### 3. Convention Drift

Early code follows one convention, later code follows another. Neither is wrong but the codebase becomes harder to navigate.

**What to look for:**

- Older routes with minimal error context vs newer routes with rich fallback logic
- Component prop interfaces that evolved (older: inline types, newer: extracted `Props` types)
- Import style changes over time
- File organization patterns that shifted

**Fix pattern:** Migrate toward the newer/better convention. Update `.AGENTS.md` if the convention isn't documented.

### 4. Orphaned & Dead Code

Code left behind from refactors where the agent replaced functionality but didn't clean all references.

**What to look for:**

- Exported functions with zero import sites
- Components only imported in commented-out code
- Type definitions that no longer match any data shape
- Deprecated fields still being read/written
- Feature flags or conditional paths for features that shipped long ago

**Fix pattern:** Delete. Dead code is not "future-proofing" — it's confusion.

### 5. Type Safety Erosion

Quick fixes accumulate `as any`, `as unknown`, `!` assertions, and `@ts-expect-error` suppressions.

**What to look for:**

- `as unknown as X` casts (especially `null as unknown as User` — a dangerous pattern)
- Non-null assertions on values that genuinely can be null (e.g., `.pop()!`)
- `@ts-expect-error` outside of test files
- Inconsistent type definitions for the same data across files

**Fix pattern:** Add proper type guards, use `| null` return types, narrow with runtime checks.

### 6. Silent Failures

Fire-and-forget operations with no error handling or logging.

**What to look for:**

- `void someAsyncFunction()` with no `.catch()`
- Side-effect operations (notifications, analytics, activity logging) that silently swallow errors
- Missing `await` on operations whose failure matters

**Fix pattern:** At minimum add error logging. For operations that affect data integrity, propagate the error.

## Method

### Scope Selection

Parse `$ARGUMENTS` to determine scope:

- **No args or "changed"**: Review `git diff dev...HEAD`. This is the default — what changed on this branch.
- **"broad \<area\>"**: Scan an entire area (e.g., `broad src/lib/hooks`, `broad src/app/api`). Use parallel subagents to cover sub-directories.
- **Specific file paths**: Review only those files, but check for duplication _against the rest of the codebase_.

### For "changed" scope (default)

1. Run `git diff dev...HEAD --name-only` to get changed files
2. For each changed file, scan the anti-pattern catalog above
3. For near-duplication: search for similar code _outside_ the diff — the duplication target may be untouched code
4. Group findings by anti-pattern category

### For "broad" scope

Use parallel subagents to divide the work:

```
Subagent 1: Near-duplication scan
  - Compare all files in the target area for structural similarity
  - Look for functions/components with >70% similar structure

Subagent 2: Pattern consistency audit
  - Catalog the patterns used (error handling, data fetching, validation)
  - Identify which pattern is most common (the "convention")
  - List deviations

Subagent 3: Type safety + dead code
  - Grep for `as any`, `as unknown`, `!` assertions, `@ts-expect-error`
  - Check for unused exports
```

### Test Coverage Integration

After identifying code quality issues, assess whether test coverage would have caught them:

- If the review reveals untested logic that's also duplicated or inconsistent, note it
- If the scope warrants a full test audit, delegate: spawn a subagent with the `/write-tests audit` instruction targeting the affected modules
- Don't duplicate what `/write-tests` already does — invoke it

## Report Format

```markdown
## Simplify Review — [scope description]

### Critical (fix now)

[Issues that could cause bugs or data loss]

### Consolidate (plan needed)

[Near-duplication and pattern inconsistency that need a small refactor]

- **What**: [description]
- **Files**: [list]
- **Suggested fix**: [one-liner]
- **Effort**: S/M/L

### Clean Up (low effort)

[Dead code, stale types, minor convention drift]

### Convention Gaps

[Patterns found that aren't documented in .AGENTS.md — should be added to prevent recurrence]

### Test Gaps (if assessed)

[Modules where quality issues intersect with missing test coverage]
```

## What NOT to do

- **Don't nitpick style** — Prettier handles formatting, ESLint handles style rules
- **Don't refactor speculatively** — only consolidate code that's actually duplicated, not code that "might be" duplicated someday
- **Don't create premature abstractions** — three similar components might genuinely need to stay separate if their evolution paths differ. Use judgment.
- **Don't report issues you won't fix** — if running in fix mode, fix what you find. If running in review mode, only report what's actionable.

## Fixing vs Reporting

By default, this skill **fixes** issues it finds (when scope is "changed" or specific files). For "broad" scans, it **reports** with a consolidation plan since broad refactors need user buy-in.

When fixing:

1. Start with the highest-impact consolidation
2. Run `pnpm tsc --noEmit` after each change group
3. Run `pnpm test:run` before declaring done
4. If a fix touches code covered by `/write-tests`, run tests for that module
