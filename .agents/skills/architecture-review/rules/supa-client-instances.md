# supa-client-instances

**Category**: Supabase Client | **Severity**: MEDIUM

## Pattern

Components or hooks call `createClient()` multiple times, creating separate Supabase instances:

```ts
// BAD: creates new client each time useEffect runs
useEffect(() => {
  const supabase = createClient();
  supabase.channel("notifications")...
}, []);

// Later in same component:
const handleAction = async () => {
  const supabase = createClient(); // another instance
  await supabase.from("profiles").update(...)
};
```

## Detection

Search `src/components/` and `src/lib/hooks/` for:

- Multiple `createClient()` calls in the same file
- `createClient()` inside `useEffect` or event handlers

## Why This Matters

- Each instance has its own auth state listener
- Realtime subscriptions may miss events if on different instances
- Minor memory overhead per instance

## Fix

Call `createClient()` once at component/hook top level:

```ts
const supabase = createClient();

useEffect(() => {
  const channel = supabase.channel("notifications");
  // ...
  return () => {
    supabase.removeChannel(channel);
  };
}, [supabase]);
```

Note: `createClient()` from `src/lib/supabase/client.ts` creates a new instance each call (by design for SSR). For components, calling once per render cycle is fine.
