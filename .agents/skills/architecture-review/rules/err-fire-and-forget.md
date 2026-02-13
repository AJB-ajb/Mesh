# err-fire-and-forget

**Category**: Error Handling | **Severity**: HIGH

## Pattern

Fetch calls or Supabase operations that don't await results or handle errors:

```ts
// BAD: silently drops errors
fetch("/api/embeddings/process", {
  method: "POST",
  headers: { "x-internal-call": "true" },
}).catch(() => {});
```

## Detection

Search entire `src/` for:

- `.catch(() => {})` or `.catch(() => undefined)`
- `fetch(` not preceded by `await` or followed by `.then(` with error handling
- Supabase operations without checking `{ error }` response

## Why This Matters

- Embedding generation can silently fail, leaving profiles without embeddings
- Matching quality degrades without embeddings
- No visibility into failure rate

## Fix

At minimum, log errors. Preferably report to Sentry:

```ts
// GOOD: log + report
fetch("/api/embeddings/process", { method: "POST" }).catch((err) => {
  console.error("Embedding generation failed:", err);
  Sentry.captureException(err);
});
```

For critical operations, await and handle:

```ts
// BEST: await and handle
const res = await fetch("/api/embeddings/process", { method: "POST" });
if (!res.ok) {
  console.error("Embedding generation failed:", res.status);
}
```
