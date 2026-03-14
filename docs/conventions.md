# Codebase Conventions

Standards and patterns for the Mesh codebase. Follow these when adding new features or modifying existing code.

---

## 1. Data Access Layer (`lib/data/`)

All Supabase queries that are reused across routes or hooks should live in the DAL.

- **Parameter convention:** `supabase: SupabaseClient` is always the first parameter. This works in both server routes (`withAuth` provides it) and client hooks (`createClient()` or `useSupabase()`).
- **Error handling:** DAL functions throw on Supabase errors. Use `PGRST116` check for single-row not-found → return `null`.
- **File organization:** One file per table/domain (`profiles.ts`, `postings.ts`, `applications.ts`, etc.). Barrel re-export from `index.ts`.
- **When to add:** If you write the same Supabase query in 2+ places, extract it to the DAL.

## 2. API Route Patterns

### Always use `withAuth`

Every API route handler must be wrapped with `withAuth`. Three modes:

```typescript
// User mode (default) — requires authenticated user
export const GET = withAuth(async (req, { user, supabase, params }) => { ... });

// Cron mode — validates Bearer token from env
export const POST = withAuth(
  { authMode: 'cron', cronSecretEnv: 'MY_CRON_SECRET' },
  async (req, { supabase, params }) => { ... }
);

// Optional mode — user may be null
export const POST = withAuth(
  { authMode: 'optional' },
  async (req, { user, supabase, params }) => { ... }
);
```

### Response helpers

Use `apiError` and `apiSuccess` from `lib/errors` for all responses. Throw `AppError` for errors inside `withAuth` handlers — they're caught and mapped automatically.

### Guards for authorization

Use guard utilities from `lib/api/guards.ts`:

- `verifyPostingOwnership(supabase, postingId, userId)` — throws `NOT_FOUND` or `FORBIDDEN`
- `verifyApplicationOwnership(supabase, applicationId, userId)`
- `verifyMatchParticipant(supabase, matchId, userId)`
- `ensureProfileExists(supabase, user)` — auto-creates profile if missing

### No manual Sentry

`withAuth` handles Sentry error reporting. Never add `Sentry.captureException` inside a `withAuth` handler.

## 3. SWR Cache Keys

Always use `cacheKeys.*` from `lib/swr/keys.ts`. Never hardcode SWR key strings.

```typescript
import { cacheKeys } from "@/lib/swr/keys";

// In hooks
useSWR(cacheKeys.profile(), fetcher);
useSWR(cacheKeys.posting(postingId), fetcher);

// For invalidation
const { mutate } = useSWRConfig();
mutate(cacheKeys.profile());
```

To add a new key: add a method to the `cacheKeys` object in `keys.ts`. The value should match the SWR key or API URL used by the corresponding hook.

## 4. Client Mutations

Use `apiMutate()` from `lib/swr/api-mutate.ts` for client-side API calls that modify data:

```typescript
import { apiMutate } from "@/lib/swr/api-mutate";

const { data } = await apiMutate("/api/postings/123", {
  method: "PATCH",
  body: formData,
  successToast: "postingUpdated",
  errorFallback: "Failed to update posting.",
});
```

- Handles fetch, JSON headers, error parsing, and toasts.
- Toast keys reference `labels.toasts` — add new labels there, not inline strings.
- For optimistic SWR updates, use the `optimistic()` helper from `lib/swr/optimistic.ts`.

## 5. Hook Design

### Never accept `mutate` as a prop

Hooks should not receive `KeyedMutator` as a parameter. Instead, use `useSWRConfig().mutate(cacheKeys.xxx())` internally:

```typescript
// Bad
function useMyHook(mutate: KeyedMutator<MyData>) { ... }

// Good
function useMyHook() {
  const { mutate } = useSWRConfig();
  // ...
  mutate(cacheKeys.myData());
}
```

### Browser Supabase client

Use `useSupabase()` from `lib/supabase/use-supabase.ts` for a stable client reference in hooks:

```typescript
const supabase = useSupabase();
```

## 6. Toast Feedback

All user-facing mutations should show success/error toasts. Labels go in `lib/labels.ts` under the `toasts` section:

```typescript
// In labels.ts
toasts: {
  postingUpdated: "Posting updated successfully.",
  postingError: "Failed to update posting.",
}

// In hook/component
await apiMutate(url, { successToast: "postingUpdated" });
```

Never use inline toast strings. This keeps copy centralized and translatable.

## 7. Layout Primitives (`Stack`, `Group`, `PageContent`)

Use the layout primitives instead of ad-hoc `flex`, `space-y-*`, and `gap-*` classes. They exist to collapse spacing choices into a small, named API — especially important in an AI-agent-first codebase where unconstrained Tailwind leads to layout drift.

### Components

| Component     | Purpose                                              | Default gap            | File                      |
| ------------- | ---------------------------------------------------- | ---------------------- | ------------------------- |
| `Stack`       | Vertical flex layout                                 | `md` (12px)            | `ui/stack.tsx`            |
| `Group`       | Horizontal flex layout, center-aligned               | `sm` (8px)             | `ui/group.tsx`            |
| `PageContent` | Page-level max-width container with vertical spacing | `xl` (24px responsive) | `layout/page-content.tsx` |

### Named Gap Scale

A fixed set of gap tokens. Choose from this list — don't invent new spacing.

| Token  | Class                     | px         | Use for                                 |
| ------ | ------------------------- | ---------- | --------------------------------------- |
| `none` | —                         | 0          | No gap                                  |
| `xs`   | `gap-1`                   | 4px        | Tight badge/icon groups                 |
| `sm`   | `gap-2`                   | 8px        | Inline elements, small controls         |
| `md`   | `gap-3`                   | 12px       | Related items within a section          |
| `lg`   | `gap-4`                   | 16px       | Sibling sections, card content          |
| `xl`   | `gap-6 sm:gap-7 md:gap-8` | 24→28→32px | Page-level section spacing (responsive) |

Only `xl` scales responsively. Smaller sizes stay fixed — responsive scaling at the UI level adds noise.

### Usage

```tsx
// Vertical stack of form fields
<Stack gap="lg">
  <Input />
  <Input />
  <Button>Submit</Button>
</Stack>

// Horizontal row with icon + text
<Group gap="sm">
  <Avatar />
  <span>{name}</span>
</Group>

// Horizontal row, space-between
<Group justify="between">
  <h1>Title</h1>
  <Button>Action</Button>
</Group>

// Badge cloud
<Group wrap gap="xs">
  {tags.map(t => <Badge key={t}>{t}</Badge>)}
</Group>

// Page with max-width constraint
<PageContent size="md" className="pb-20">
  <BackLink />
  <h1>Settings</h1>
  <Card>...</Card>
</PageContent>
```

### Props

**Stack:** `gap`, `align` (`start | center | end | stretch`), `as` (HTML element), `className`.

**Group:** `gap`, `align` (adds `baseline`), `justify` (`start | center | end | between`), `wrap`, `as`, `className`.

**PageContent:** `size` (`sm | md | lg | xl | full`), plus all Stack props. No horizontal padding — AppShell handles that.

### When NOT to use

- **`<Link>` or component roots** — `as` only supports HTML elements, not components.
- **`mt-*` / `pt-*` one-offs** — intentional spacing tied to borders or separators (e.g. `border-t pt-6`).
- **Card internals** — Card already has its own responsive gap. Don't wrap Card's children in Stack.
- **Layout-specific patterns** — negative margin bleeds, absolute positioning, grid layouts.
