# dup-json-parsing

**Category**: Duplication | **Severity**: HIGH | **Impact**: ~15 API routes

## Pattern

API routes repeat identical JSON parsing boilerplate:

```ts
// BAD: duplicated in every POST/PATCH route
let body: { field?: type };
try {
  body = await req.json();
} catch {
  return apiError("VALIDATION", "Invalid JSON body", 400);
}
```

## Detection

Search `src/app/api/**/route.ts` for:

- `await req.json()` inside try/catch
- `apiError("VALIDATION", "Invalid JSON body"`

Count: If more than 3 routes have this pattern, extract a utility.

## Fix

Create `src/lib/api/parse-json.ts`:

```ts
export async function parseJsonBody<T>(req: Request): Promise<T | Response> {
  try {
    return (await req.json()) as T;
  } catch {
    return apiError("VALIDATION", "Invalid JSON body", 400);
  }
}
```

Usage in routes:

```ts
const result = await parseJsonBody<{ posting_id: string }>(req);
if (result instanceof Response) return result;
const { posting_id } = result;
```
