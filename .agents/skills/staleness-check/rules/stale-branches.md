# stale-branches

**Category**: Branches | **Severity**: MEDIUM

## What to Check

Remote branches that are merged, abandoned, or stale.

## Detection Steps

### 1. List merged branches

```bash
# Branches already merged into dev
git branch -r --merged origin/dev | grep -v "origin/main\|origin/dev\|HEAD"
```

### 2. List stale branches (no commits in 2+ weeks)

```bash
# All remote branches with last commit date
git for-each-ref --sort=-committerdate refs/remotes/origin --format='%(committerdate:short) %(refname:short)' | \
  awk -v cutoff=$(date -d '14 days ago' +%Y-%m-%d) '$1 < cutoff {print}'
```

### 3. Check for worktrees pointing to deleted branches

```bash
git worktree list
# Cross-reference with active branches
```

### 4. Check .handoffs/ for active tasks

If a handoff brief exists for a branch, the branch may still be needed even if stale.

## Actions

| Finding                     | Action                                      |
| --------------------------- | ------------------------------------------- |
| Merged and not deleted      | Delete: `git push origin --delete <branch>` |
| Stale > 2 weeks, no PR      | Check with author; likely abandoned         |
| Stale but has open PR       | Ping the PR for status                      |
| Worktree for deleted branch | Remove: `git worktree remove <path>`        |
