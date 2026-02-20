---
name: land
description: Merge the current worktree branch into dev, push, and clean up the worktree.
argument-hint: "[branch-name] (auto-detected if omitted)"
---

# Land Worktree Branch

Merge a completed worktree branch into `dev`, push to remote, and clean up.

## 1. Detect Branch

If `$ARGUMENTS` is provided, use it as the branch name. Otherwise:

1. Check if cwd is inside a worktree (not the main repo at `/home/ajb/repos/MeshIt`):
   ```
   git rev-parse --show-toplevel
   ```
2. Get the current branch name:
   ```
   git branch --show-current
   ```
3. If on `dev` or `main`, abort with an error — you need to be on a feature branch or provide a branch name.

Store the branch name and worktree path for later steps.

## 2. Validate

Before merging, confirm:

1. Working tree is clean (`git status --porcelain` returns empty). If not, abort and tell the user to commit or stash first.
2. The branch exists and has commits ahead of `dev`.

## 3. Merge to dev

1. `cd` to the main repo: `/home/ajb/repos/MeshIt`
2. Ensure the main repo is on `dev`:
   ```
   git checkout dev
   ```
3. Fast-forward merge the branch:
   ```
   git merge <branch-name>
   ```
4. If merge fails (conflicts), abort and tell the user.

## 4. Push

```
git push
```

If push fails, report the error and stop.

## 5. Clean Up

1. Remove the worktree:
   ```
   git worktree remove <worktree-path>
   ```
2. Delete the local branch:
   ```
   git branch -d <branch-name>
   ```
3. Delete the remote branch:
   ```
   git push origin --delete <branch-name>
   ```
4. Prune stale remote-tracking references:
   ```
   git fetch --prune origin
   ```

## 6. Confirm

Report what was done:

- Branch merged
- Pushed to remote
- Worktree removed
- Local branch deleted
- Remote branch deleted
