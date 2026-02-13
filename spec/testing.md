# Testing

## Test Users

Two standard accounts for manual and AI-assisted testing. Both share the same password stored in `.env` as `TEST_USER_PASSWORD`.

| Account | Email              | Purpose                          |
| ------- | ------------------ | -------------------------------- |
| User 1  | ajb60721@gmail.com | Primary test user                |
| User 2  | ajb60722@gmail.com | Second user for multi-user flows |

### Setup

```bash
pnpm tsx scripts/seed-test-users.ts
```

Creates both accounts via Supabase Admin API with `email_confirm: true`, bypassing email verification. Idempotent — safe to run repeatedly (updates existing users).

Requires `SUPABASE_SERVICE_ROLE_KEY` and `TEST_USER_PASSWORD` in `.env`.

### Multi-User Test Scenarios

Many features require two users interacting:

- Create posting (User 1) → Express interest (User 2)
- Send friendship request (User 1) → Accept (User 2)
- Friend-ask mode: User 1 creates posting → selects User 2 as friend → User 2 responds
- Apply to posting (User 2) → Accept application (User 1) → Conversation opens

### Login

Use email + password on `/login`. Google OAuth is not accessible to AI agents.

## Unit Tests

```bash
pnpm test:run          # Run once
pnpm test              # Watch mode
```

Co-located in `src/<path>/__tests__/<module>.test.ts`. See `.AGENTS.md` for test file conventions.

## E2E Tests

```bash
pnpm test:e2e
```

Uses Playwright. Test utilities in `tests/utils/` (auth helpers, factories, Supabase admin client).

## Type Check & Lint

```bash
pnpm tsc --noEmit      # Type check (empty output = success)
pnpm lint              # ESLint
pnpm build             # Full build (catches SSR issues)
```
