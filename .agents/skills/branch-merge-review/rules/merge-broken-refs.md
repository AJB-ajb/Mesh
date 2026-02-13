# merge-broken-refs

**Category**: Merge | **Severity**: HIGH

## What to Check

After merging parallel branches, cross-references between files may break: imports, links in docs, references in configs.

## Detection

### 1. TypeScript compilation

The fastest way to catch broken imports:

```bash
pnpm tsc --noEmit
```

### 2. Broken doc links

```bash
# Find markdown links and check targets exist
grep -roh '\[.*\](\..*\.md)' spec/ docs/ README.md | \
  grep -oP '\(\..*?\)' | tr -d '()' | while read link; do
    [ ! -f "$link" ] && echo "BROKEN: $link"
  done
```

### 3. Broken config references

Check that files referenced in configs still exist:

- `tsconfig.json` paths
- `package.json` scripts
- `.github/workflows/*.yml` paths

### 4. Stale imports

After file moves/renames in one branch, the other branch's imports may point to old paths:

```bash
# Check for import errors
pnpm lint  # ESLint catches unresolved imports
```

## Fix

1. Run `pnpm tsc --noEmit` and `pnpm lint` after every merge
2. Fix all reported errors before marking the merge as complete
3. Update doc links manually (TypeScript won't catch these)
