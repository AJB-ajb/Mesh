# comp-error-boundary

**Category**: Component Structure | **Severity**: MEDIUM

## Pattern

No React error boundaries in the app. If a component throws during render, the entire page crashes with no fallback UI.

## Detection

Search for:

- `ErrorBoundary` or `error-boundary` imports — should exist
- `error.tsx` files in `src/app/` route segments — Next.js error boundaries
- `react-error-boundary` package in `package.json`

## Fix

Next.js App Router supports `error.tsx` files per route segment:

```tsx
// src/app/(dashboard)/error.tsx
"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

Add `error.tsx` to:

- `src/app/(dashboard)/` — catches all dashboard errors
- `src/app/(auth)/` — catches auth flow errors
- Any route with complex interactive components
