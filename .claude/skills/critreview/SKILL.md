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
- **AI-agentic codebase hygiene** — did this change introduce near-duplication of existing code? Does it follow the same patterns used elsewhere (error handling, data fetching, validation)? Or did it reinvent something that already exists? Check the `/simplify` anti-pattern catalog if unsure.
- **Anything else that looks wrong**

Don't nitpick style. Focus on things that would cause real problems.

## 3. Root cause analysis

After collecting issues, step back and ask three deeper questions. These matter more than the individual findings — they're what turns a code review into a codebase review.

- **Is this an architectural issue?** Does the bug or concern point to a design problem — a missing abstraction, a leaky boundary, a responsibility in the wrong layer? A one-line fix might paper over a structural gap that will keep producing bugs.
- **Does this point to deeper issues?** Look for patterns across findings. If three issues all stem from inconsistent error handling, the real problem isn't any one of them — it's the missing convention. Name the underlying cause.
- **Would an AI agent repeat this mistake?** This codebase is primarily written by AI agents in independent sessions. If the issue arose because an agent lacked context (e.g., didn't know about an existing utility, reinvented a pattern differently, or missed a convention), flag it. The fix might be updating `.AGENTS.md` or `CLAUDE.md` rather than just fixing the code — so the same class of mistake doesn't recur in the next session.

If none of these apply, say so. Don't force architectural concerns where there aren't any.

## 4. Report

For each issue found, state:

1. **File and line**
2. **What's wrong**
3. **Severity** (bug / concern / nit)

Then include a **Root cause summary** section covering the three questions above. This section can be brief ("no architectural issues found, no agent-repeatability concerns") or detailed, depending on what you found.

If everything looks solid, say so — don't invent issues.
