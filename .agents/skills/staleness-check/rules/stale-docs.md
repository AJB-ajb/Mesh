# stale-docs

**Category**: Documentation | **Severity**: HIGH

## What to Check

Documentation files in `docs/` and root that reference code, paths, or features that no longer exist.

## Detection Steps

### 1. Check file paths mentioned in docs

```bash
# Extract file paths from docs
grep -rohP 'src/[a-zA-Z0-9/_.-]+' docs/ spec/ README.md .AGENTS.md | sort -u | while read path; do
  [ ! -e "$path" ] && echo "STALE PATH: $path"
done
```

### 2. Check component/function names

```bash
# Extract likely code references (PascalCase or camelCase identifiers)
grep -rohP '`[A-Z][a-zA-Z]+`' docs/ | sort -u | while read ref; do
  name=$(echo "$ref" | tr -d '`')
  grep -rq "$name" src/ || echo "STALE REF: $ref"
done
```

### 3. Check data-model.md against migrations

```bash
# Get current columns from latest migration
# Compare with columns listed in docs/data-model.md
# Flag any mismatches
```

### 4. Check environment variable references

```bash
# Vars mentioned in docs
grep -rohP '[A-Z_]{3,}' docs/ | sort -u > /tmp/doc-vars
# Vars actually used in code
grep -rohP 'process\.env\.[A-Z_]+' src/ | sed 's/process.env.//' | sort -u > /tmp/code-vars
# Diff
diff /tmp/doc-vars /tmp/code-vars
```

## Freshness Indicators

A doc is likely stale if:

- Last modified > 30 days ago AND references code that changed since
- Mentions features marked as "TODO" or "planned" that are now implemented
- Lists versions that are significantly outdated
- References directories that don't exist

## Fix

Update the doc or delete it if no longer needed. Follow the format conventions in `docs/.AGENTS.md`.
