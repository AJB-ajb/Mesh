# merge-issue-tracking

**Category**: Issue Management | **Severity**: MEDIUM

## What to Check

After merging, GitHub issues should reflect the new state. PRs from parallel branches often partially address issues or complete them without updating.

## Process

### 1. Check PR body for issue references

Look for `Closes #N`, `Fixes #N`, `Addresses #N` in the PR description and commit messages.

### 2. Cross-reference with open issues

```bash
# List open issues
gh issue list --state open

# For each issue, check if the PR's changes address it
gh issue view N
```

### 3. Actions to take

| Situation                                | Action                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| PR fully resolves an issue               | `gh issue close N --comment "Resolved in PR #M"`                           |
| PR partially addresses an issue          | `gh issue comment N --body "Partially addressed in PR #M. Remaining: ..."` |
| PR introduces new work                   | `gh issue create --title "..." --body "..."`                               |
| PR makes an issue obsolete               | `gh issue close N --comment "No longer relevant after PR #M"`              |
| PR creates regression for existing issue | Comment on the issue with details                                          |

### 4. Label updates

```bash
# Remove in-progress label if work is done
gh issue edit N --remove-label "in-progress"

# Add labels for new discoveries
gh issue edit N --add-label "bug"
```

## Common Misses

- Feature branches that implement something an issue asked for, but don't reference the issue
- Issues that are resolved as a side effect of a refactor
- Issues whose scope changed due to merged architectural decisions
