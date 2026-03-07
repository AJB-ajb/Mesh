---
name: critreview
description: Critically review the current worktree's changes in a fresh agent session. Finds bugs, spec mismatches, missing tests, and things you'd miss when too close to the code.
argument-hint: "[focus area] (optional — e.g. 'security', 'spec compliance')"
---

# Critical Review

Review all changes on the current branch vs `dev` with fresh eyes. Be adversarial — assume bugs and unreasonable changes exist and find them.

## 1. Gather context

```
git diff dev...HEAD
git log dev..HEAD --oneline
```

If `$ARGUMENTS` is provided, weight your review toward that area.

## 2. Review

Look at every change. Consider:

- **Correctness** — logic errors, edge cases, off-by-ones, race conditions
- **Spec compliance** — does the implementation match what the specs describe? (see `spec/README.md`)
- **Test coverage** — are the right failure modes tested? Are tests actually assertive?
- **Security** — injection, auth bypass, data leaks
- **Anything else that looks wrong**

Don't nitpick style. Focus on things that would cause real problems.

## 3. Report

For each issue found, state:

1. **File and line**
2. **What's wrong**
3. **Severity** (bug / concern / nit)

If everything looks solid, say so — don't invent issues.
