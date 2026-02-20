---
name: staleness-check
description: Checks for stale artifacts across the repo — outdated docs, orphaned issues, stale branches, and repo structure drift. Run weekly or before releases.
metadata:
  version: "1.0.0"
  scope: Mesh-specific
---

# Staleness Check

Periodic health check for documentation, issues, branches, and repo structure. Ensures everything stays current as the codebase evolves.

## When to Run

- Weekly (recommended)
- Before major releases
- After completing a milestone or closing an epic
- When onboarding new contributors

## Checklist

### 1. Documentation Freshness (HIGH)

| Check                                  | Rule               | How                                     |
| -------------------------------------- | ------------------ | --------------------------------------- |
| `docs/` files match current code       | `stale-docs`       | Compare docs claims against actual code |
| `spec/` files reflect current features | `stale-specs`      | Check spec vs implementation            |
| `data-model.md` matches DB schema      | `stale-data-model` | Compare with migrations                 |
| README.md is accurate                  | `stale-readme`     | Verify setup instructions work          |
| `.AGENTS.md` conventions are current   | `stale-agents`     | Check commands, paths, patterns         |

### 2. GitHub Issues (MEDIUM)

| Check                             | Rule           | How                                 |
| --------------------------------- | -------------- | ----------------------------------- |
| Open issues are still relevant    | `stale-issues` | Review open issues                  |
| Labels are consistent             | `stale-issues` | Check for orphaned labels           |
| Milestones are up to date         | `stale-issues` | Verify milestone assignments        |
| `untested` issues track real gaps | `stale-issues` | Cross-ref with actual test coverage |

### 3. Branches (MEDIUM)

| Check                  | Rule             | How                                 |
| ---------------------- | ---------------- | ----------------------------------- |
| Stale remote branches  | `stale-branches` | Branches not touched in 2+ weeks    |
| Merged but not deleted | `stale-branches` | Branches already merged to dev/main |
| Worktrees still needed | `stale-branches` | Check `.handoffs/` for active tasks |

### 4. Repo Structure (LOW)

| Check                       | Rule              | How                                  |
| --------------------------- | ----------------- | ------------------------------------ |
| Empty or unused directories | `stale-structure` | `find` for empty dirs                |
| Orphaned files              | `stale-structure` | Files not imported anywhere          |
| Config drift                | `stale-structure` | package.json scripts, tsconfig paths |

## Output Format

```markdown
## Staleness Report - [date]

### Documentation

- [STALE] `docs/foo.md` — References removed component `Bar` (line 42)
- [OK] `docs/data-model.md` — Matches current schema
- [UPDATE NEEDED] `spec/matching.md` — Missing new location_mode dimension

### Issues

- [STALE] #N — "Title" — No activity in 30 days, may be resolved
- [CLOSE] #N — "Title" — Resolved by PR #M but not closed
- [UPDATE] #N — "Title" — Scope changed, description needs refresh

### Branches

- [DELETE] `feat/old-feature` — Merged 3 weeks ago, not deleted
- [STALE] `fix/something` — Last commit 4 weeks ago, no PR

### Structure

- [EMPTY] `src/components/voice/` — All files removed in redesign
- [ORPHAN] `scripts/check-credits.sh` — References deleted doc

### Summary

- Stale items: N
- Actions needed: N
```
