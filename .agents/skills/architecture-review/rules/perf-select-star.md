# perf-select-star

**Category**: Performance | **Severity**: LOW-MEDIUM

## Pattern

Queries that select all columns when only a few are needed:

```ts
// BAD: fetches all columns including potentially large text/jsonb fields
const { data } = await supabase.from("profiles").select("*").eq("user_id", id);

// GOOD: only what's needed
const { data } = await supabase
  .from("profiles")
  .select("user_id, full_name, headline, skills")
  .eq("user_id", id);
```

## Detection

Search `src/app/api/` and `src/lib/hooks/` for:

- `.select("*")` or `.select()` with no argument
- Especially on tables with large columns (profiles.embedding, profiles.source_text)

## Why This Matters

- `embedding` is a 1536-dimension vector — large payload
- `source_text` and `previous_profile_snapshot` can be large
- Unnecessary data transfer increases latency

## Fix

Specify only needed columns. For common column sets, create named selections:

```ts
const PROFILE_CARD_FIELDS = "user_id, full_name, headline, skills, location";
const PROFILE_FULL_FIELDS = "*, !embedding"; // exclude heavy fields
```
