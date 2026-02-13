# stale-structure

**Category**: Repo Structure | **Severity**: LOW

## What to Check

Empty directories, orphaned files, and config drift.

## Detection Steps

### 1. Empty directories

```bash
find src/ -type d -empty
```

### 2. Orphaned scripts

```bash
# Scripts not referenced in package.json or docs
ls scripts/ | while read f; do
  grep -rq "$f" package.json .AGENTS.md README.md docs/ || echo "ORPHAN: scripts/$f"
done
```

### 3. Unused exports

```bash
# Files in src/lib/ not imported by any other file
for f in $(find src/lib -name "*.ts" -not -name "*.test.*" -not -path "*__tests__*"); do
  base=$(basename "$f" .ts)
  importers=$(grep -rl "from.*$base" src/ --include="*.ts" --include="*.tsx" | grep -v "$f" | wc -l)
  [ "$importers" -eq 0 ] && echo "POSSIBLY UNUSED: $f"
done
```

### 4. package.json script drift

```bash
# Check all scripts reference valid commands
node -e "
  const pkg = require('./package.json');
  for (const [name, cmd] of Object.entries(pkg.scripts || {})) {
    console.log(name + ': ' + cmd);
  }
"
```

### 5. Config file consistency

- `tsconfig.json` paths match actual directory structure
- `.gitignore` doesn't ignore tracked files (or vice versa)
- `.env.example` matches what code actually reads

## Actions

| Finding         | Action                                                |
| --------------- | ----------------------------------------------------- |
| Empty directory | Delete unless intentionally empty (e.g., placeholder) |
| Orphaned script | Delete or document in README                          |
| Unused export   | Verify no dynamic imports, then delete                |
| Script drift    | Update package.json or fix command                    |
