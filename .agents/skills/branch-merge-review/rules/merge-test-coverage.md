# merge-test-coverage

**Category**: Merge | **Severity**: MEDIUM

## What to Check

Parallel branches may add code without tests, or tests that don't cover integration points.

## Detection

### 1. Check for new code without tests

```bash
# Files added/modified in PR
gh pr diff <PR> --name-only | grep "^src/"

# Check if corresponding test files exist
for f in $(gh pr diff <PR> --name-only | grep "^src/"); do
  dir=$(dirname "$f")
  base=$(basename "$f" .tsx)
  base=$(basename "$base" .ts)
  test_file="$dir/__tests__/$base.test.ts"
  if [ ! -f "$test_file" ]; then
    echo "MISSING TEST: $f"
  fi
done
```

### 2. Check for untested issue labels

Per `.AGENTS.md`, untested code should have a GitHub issue with label `untested`:

```bash
gh issue list --label "untested"
```

### 3. Verify tests pass after merge

```bash
pnpm test:run
pnpm lint
pnpm tsc --noEmit
```

## Requirements (from .AGENTS.md)

- **New utility/lib code**: Must have unit tests
- **New API routes**: Must have unit tests (mock Supabase, test auth, response shapes)
- **New hooks**: Must have unit tests (`renderHook`)
- **Bug fixes**: Must include regression test
- **UI components**: Tests recommended; if skipped, file `untested` issue
