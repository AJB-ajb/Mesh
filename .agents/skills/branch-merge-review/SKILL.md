---
name: branch-merge-review
description: Reviews PRs from parallel branches. Identifies merge conflicts, integration issues, and issue updates needed. Critical review focused on correctness after concurrent development.
metadata:
  version: "1.0.0"
  scope: MeshIt-specific
---

# Branch Merge Review

Critical review skill for PRs, especially from branches developed in parallel. Focused on catching integration issues that arise when multiple agents or developers work concurrently.

## When to Use

- Reviewing any PR before merge
- After merging parallel branches (post-merge audit)
- When merging long-lived feature branches back to `dev`

## Review Process

### Phase 1: Context Gathering

```bash
# 1. Understand what changed
gh pr view <PR_NUMBER> --json title,body,files,commits
gh pr diff <PR_NUMBER>

# 2. Check the target branch for recent merges
git log --oneline dev..HEAD  # or main..HEAD

# 3. Check for related open issues
gh issue list --state open --label "in-progress"

# 4. Check for other open PRs that touch the same files
gh pr list --state open --json number,title,files
```

### Phase 2: Critical Review Checklist

Work through each rule in `rules/` for the PR diff. Key areas:

| Check                             | Rule                       | Priority |
| --------------------------------- | -------------------------- | -------- |
| Conflicting changes to same files | `merge-file-conflicts`     | CRITICAL |
| Schema migration ordering         | `merge-migration-order`    | CRITICAL |
| Duplicate feature implementations | `merge-duplicate-features` | HIGH     |
| Broken cross-references           | `merge-broken-refs`        | HIGH     |
| Issue status alignment            | `merge-issue-tracking`     | MEDIUM   |
| Test coverage for merged code     | `merge-test-coverage`      | MEDIUM   |

### Phase 3: Issue Management

After reviewing, update GitHub issues:

```bash
# Close issues resolved by this PR
gh issue close N --comment "Resolved in PR #M"

# Update issues partially addressed
gh issue comment N --body "Partially addressed in PR #M. Remaining: ..."

# Create new issues for discovered problems
gh issue create --title "fix: [description]" --body "Found during merge review of PR #M"
```

### Phase 4: Report

Use this format for the review comment:

```markdown
## Merge Review

### Summary

[1-2 sentence overview of what this PR does]

### Critical Issues

- [ ] [issue description] — [file:line]

### Warnings

- [ ] [warning description] — [file:line]

### Integration Notes

- [Any notes about interaction with other recent changes]

### Issue Updates

- Closes #N
- Partially addresses #M (remaining: ...)
- New issue needed: [description]
```

## Parallel Branch Patterns

MeshIt uses parallel development via:

- Multiple Claude Code sessions (`.handoffs/` briefs)
- Feature branches from `dev`
- Worktrees for concurrent work

Common integration issues:

1. **Same file edited differently** — Both branches modify a shared component
2. **Schema conflicts** — Migration timestamps overlap or contradict
3. **Hook dependency changes** — One branch adds a dependency another branch doesn't expect
4. **Import path changes** — One branch moves/renames a file another branch imports
