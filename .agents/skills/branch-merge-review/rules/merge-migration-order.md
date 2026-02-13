# merge-migration-order

**Category**: Merge | **Severity**: CRITICAL

## What to Check

Supabase migrations run in filename order (timestamp prefix). Parallel branches may create migrations with conflicting timestamps or dependencies.

## Detection

```bash
# List all migrations
ls -la supabase/migrations/

# Check for timestamp conflicts
ls supabase/migrations/*.sql | sed 's/.*\///' | sort | head -20

# Check if any migration references a table/column another migration creates
grep -l "ALTER TABLE\|ADD COLUMN\|DROP COLUMN" supabase/migrations/*.sql
```

## Common Issues

### 1. Timestamp collisions

Two branches create migrations with the same timestamp prefix.

- **Fix**: Rename one migration to a later timestamp

### 2. Dependency ordering

Migration A adds a column that migration B references, but B's timestamp is earlier.

- **Fix**: Rename to ensure correct ordering

### 3. Contradicting changes

Migration A adds a column, migration B from another branch also adds it (or drops it).

- **Fix**: Combine into a single migration, or add IF EXISTS/IF NOT EXISTS guards

### 4. Missing migration for merged feature

Branch merges code that expects a new column but the migration lives in the other branch.

- **Fix**: Ensure all migrations are included in the merge

## Verification

After merge, run:

```bash
supabase migration list  # Check all migrations are in order
supabase db push --dry-run  # Verify they apply cleanly
```
