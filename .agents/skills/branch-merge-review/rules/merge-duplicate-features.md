# merge-duplicate-features

**Category**: Merge | **Severity**: HIGH

## What to Check

Parallel branches may implement the same feature differently, or create duplicate utilities.

## Detection

### 1. Duplicate utility functions

```bash
# Check for similar function names across new files
gh pr diff <PR> --name-only | xargs grep -l "export function\|export const" | \
  xargs grep "export" | sort
```

### 2. Duplicate components

Search for components with similar names or purposes in different directories.

### 3. Duplicate API routes

Check if two branches created routes for the same resource:

```bash
ls src/app/api/  # Look for similar route names
```

### 4. Duplicate types

Check for type definitions that overlap:

```bash
grep -r "export type\|export interface" src/lib/types/ src/lib/supabase/
```

## Fix

When duplicates are found:

1. Keep the more complete/tested implementation
2. Remove the duplicate
3. Update all imports to point to the kept version
4. Run tests to verify nothing breaks
