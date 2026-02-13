# err-silent-catch

**Category**: Error Handling | **Severity**: MEDIUM

## Pattern

Catch blocks that swallow errors without logging or reporting:

```ts
// BAD
try { ... } catch { /* nothing */ }
.catch(() => {})
catch (err) { console.error(err); } // OK for dev, not for prod
```

## Detection

Search `src/` for:

- `catch {}` or `catch () {}`
- `.catch(() =>` with empty body or just `undefined`
- `console.error` in catch blocks without Sentry reporting (in production code paths)

## Fix

All catch blocks should either:

1. Re-throw (if caller should handle)
2. Report to Sentry (if production-visible)
3. Log with context (at minimum)

```ts
// GOOD
catch (err) {
  console.error("[embeddings] Failed to process:", err);
  Sentry.captureException(err, { tags: { area: "embeddings" } });
}
```
