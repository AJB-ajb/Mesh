# Architecture Overview

## System Layers

```
Browser (React 19)
  → Next.js App Router (src/app/)
    → API Routes (src/app/api/)
      → Supabase (PostgreSQL + pgvector + Auth + Realtime)
```

## Key Patterns

### Data Fetching: SWR Hooks

Custom hooks in `src/lib/hooks/` wrap `useSWR` for client-side data fetching. SWRProvider configured in root layout (`src/app/layout.tsx`). Each hook handles its own Supabase queries and cache keys.

### API Routes: withAuth Middleware

All API routes use `withAuth()` from `src/lib/api/with-auth.ts`. It validates the Supabase session and passes the authenticated user to the handler. Returns 401 if unauthenticated.

### Supabase Client

- **Browser**: `createClient()` from `src/lib/supabase/client.ts` — creates a new instance per call
- **Server**: `createServerClient()` from `src/lib/supabase/server.ts` — uses cookies for auth
- **Admin**: Service role client for privileged operations (seeding, migrations)

### Realtime Subscriptions

Supabase channels for notifications, conversations, and presence. Implemented as `useEffect` subscriptions in hooks (e.g., `use-realtime-chat.ts`, `use-presence.ts`). These are **not** SWR-managed — they're persistent WebSocket connections.

### AI Pipeline

1. **Text extraction**: Gemini 2.0 Flash parses free-form text → structured profile/posting fields (`src/lib/ai/`)
2. **Embeddings**: OpenAI text-embedding-3-small generates 1536d vectors stored in pgvector
3. **Matching**: Cosine similarity + weighted scoring across dimensions (`src/lib/matching/`)

## Critical File Paths

| Layer      | Path                   | Purpose                                           |
| ---------- | ---------------------- | ------------------------------------------------- |
| Pages      | `src/app/(auth)/`      | Auth routes (login, callback, onboarding)         |
| Pages      | `src/app/(dashboard)/` | Authenticated app pages                           |
| API        | `src/app/api/`         | REST endpoints (matches, postings, extract, etc.) |
| Hooks      | `src/lib/hooks/`       | SWR data-fetching hooks                           |
| AI         | `src/lib/ai/`          | Gemini, OpenAI, LangChain integrations            |
| Matching   | `src/lib/matching/`    | Scoring algorithms                                |
| Supabase   | `src/lib/supabase/`    | Client factories, types, middleware               |
| Components | `src/components/`      | UI (layout, posting, profile, match, ui/)         |
| Migrations | `supabase/migrations/` | SQL schema migrations                             |

## Data Model

See [data-model.md](data-model.md) for the full database schema.

Core tables: `profiles` (1:1 with auth.users) → `projects` (postings) → `matches` (user×posting scores).

## Testing

- **Unit**: Vitest, co-located in `__tests__/` dirs. Run: `pnpm test:run`
- **E2E**: Playwright in `tests/e2e/`. Run: `pnpm test:e2e`
- See [../spec/testing.md](../spec/testing.md) for test users and conventions
