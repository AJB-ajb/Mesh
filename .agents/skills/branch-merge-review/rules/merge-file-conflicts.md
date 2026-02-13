# merge-file-conflicts

**Category**: Merge | **Severity**: CRITICAL

## What to Check

When parallel branches modify the same files, even if git merges cleanly, the combined result may be logically wrong.

## Detection

```bash
# List files changed in this PR
gh pr diff <PR> --name-only

# Check if any other open PRs touch the same files
gh pr list --state open --json number,files | jq '.[].files[]' | sort | uniq -d

# Check recent commits on target branch for same files
git log --oneline --name-only dev -- <files from PR>
```

## Common Conflict Patterns

### 1. Component prop changes

Branch A adds a new required prop. Branch B uses the component without it.

- **Detection**: Search for component usage across both branches
- **Fix**: Add the missing prop in the other branch's usages

### 2. Hook return shape changes

Branch A adds a new field to a hook's return value. Branch B destructures the old shape.

- **Detection**: Compare hook exports and their consumers
- **Fix**: Update destructuring patterns

### 3. Type definition conflicts

Both branches modify `types.ts` or add to the same interface.

- **Detection**: Check for duplicate field names in merged types
- **Fix**: Reconcile type definitions

### 4. CSS/Tailwind class conflicts

Both branches style the same component differently.

- **Detection**: Visual inspection of shared components
- **Fix**: Review in browser, pick the correct styling
