# Contributing to Mesh

## Local Setup

```bash
pnpm install
cp .env.example .env.local
# Fill in your API keys in .env.local
pnpm dev
```

Open http://localhost:3000.

## Branch Naming

Use typed prefixes:

```
feat/calendar-sync
fix/auth-redirect
chore/update-deps
refactor/profile-hooks
docs/api-reference
test/matching-scoring
```

## Commit Messages

Follow conventional commit format (guideline, not enforced):

```
feat(matching): add location-based filtering
fix(auth): handle expired OAuth tokens
chore(deps): update supabase to 2.x
```

## Pull Requests

1. Create a branch from `main` with the appropriate prefix
2. Make your changes
3. Open a PR — the template will auto-populate
4. CI must pass (lint, type-check, tests, build)
5. Squash-merge into `main`

For significant changes, ping a teammate for review.

## Pre-commit Hooks

Husky runs `lint-staged` on every commit, which auto-formats staged files with Prettier and checks them with ESLint. If the hook fails, fix the issues and try again.

## Project Structure

- `spec/` — Product specifications and feature specs
- `docs/` — Technical documentation
- `src/` — Application source code
- `tests/` — E2E and integration tests

## Scripts

| Command         | Description             |
| --------------- | ----------------------- |
| `pnpm dev`      | Start dev server        |
| `pnpm build`    | Production build        |
| `pnpm lint`     | Run ESLint              |
| `pnpm test`     | Unit tests (watch mode) |
| `pnpm test:run` | Unit tests (once)       |
| `pnpm test:e2e` | Playwright E2E tests    |
