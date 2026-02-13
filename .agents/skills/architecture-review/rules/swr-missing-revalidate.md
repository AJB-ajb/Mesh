# swr-missing-revalidate

**Category**: SWR & Data Fetching | **Severity**: MEDIUM

## Pattern

Hooks perform mutations (insert, update, delete) without calling `mutate()` to revalidate the SWR cache:

```ts
// BAD: UI won't reflect the change until next revalidation interval
supabase
  .from("messages")
  .update({ read: true })
  .eq("id", messageId)
  .then(({ error }) => {
    if (error) console.error(error);
  });
```

## Detection

Search `src/lib/hooks/` for:

- `.update(`, `.insert(`, `.delete(` calls
- Check if they're followed by `mutate()` or `revalidate`

## Fix

After any mutation, revalidate the relevant SWR key:

```ts
await supabase.from("messages").update({ read: true }).eq("id", messageId);
mutate("/api/inbox"); // or specific key
```

Or use optimistic updates:

```ts
mutate("/api/inbox", async (current) => {
  await supabase.from("messages").update({ read: true }).eq("id", messageId);
  return { ...current, unread_count: current.unread_count - 1 };
}, { optimisticData: ... });
```
