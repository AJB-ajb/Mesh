# err-response-format

**Category**: Error Handling | **Severity**: MEDIUM

## Pattern

API routes return error responses in different formats:

```ts
// Format A (inconsistent)
return NextResponse.json({ error: "message" }, { status: 400 });

// Format B (standard — use this)
return apiError("VALIDATION", "message", 400);
```

## Detection

Search `src/app/api/**/route.ts` for:

- `NextResponse.json({ error:` — should use `apiError()` instead
- Routes not importing from `src/lib/api/errors`

## Fix

All API routes should use `apiError()` from `src/lib/api/` for consistent error shape:

```ts
{ error: { code: string, message: string } }
```

This enables clients to handle errors uniformly.
