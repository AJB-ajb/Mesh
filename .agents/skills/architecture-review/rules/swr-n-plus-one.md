# swr-n-plus-one

**Category**: SWR & Data Fetching | **Severity**: HIGH

## Pattern

Hooks that fetch a list, then make individual queries per item:

```ts
// BAD: N+1 — for each conversation, fetch profile, posting, messages, count
const enriched = await Promise.all(
  conversations.map(async (conv) => {
    const profile = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", conv.other_user);
    const posting = await supabase
      .from("postings")
      .select("*")
      .eq("id", conv.posting_id);
    const messages = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id);
    // ...
  }),
);
```

## Detection

Search `src/lib/hooks/` and `src/app/api/` for:

- `.map(async` followed by Supabase queries inside the callback
- `Promise.all(items.map(` with database calls
- Count: If an array has N items and makes M queries per item, total is N\*M

## Fix

Use Supabase joins or database views:

```ts
// GOOD: single query with joins
const { data } = await supabase
  .from("conversations")
  .select(
    `
    *,
    other_profile:profiles!other_user_id(*),
    posting:postings!posting_id(title),
    messages(content, created_at)
  `,
  )
  .eq("user_id", userId);
```

Or create a database function/view that enriches conversations server-side.

For large lists, paginate and lazy-load enrichment data.
