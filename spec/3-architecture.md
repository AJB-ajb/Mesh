# Architecture

> Tech stack, key libraries, deployment, and development tooling.

## Core

| Component | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | TypeScript |
| UI library | React 19 | |
| Package manager | pnpm 10 | |
| Node version manager | fnm | |

## Database & Backend

| Component | Technology | Notes |
|---|---|---|
| Database | Supabase (PostgreSQL) | Auth, real-time subscriptions, RLS |
| Client library | `@supabase/supabase-js` | |
| SSR support | `@supabase/ssr` | |
| Auth providers | Google, GitHub, LinkedIn | OAuth |
| Vector search | pgvector | Embedding storage + cosine similarity |

## AI

| Component | Technology | Notes |
|---|---|---|
| Text generation | Google Gemini (`@google/generative-ai`) | Extraction, deep matching, formatting |
| Embeddings | OpenAI | Profile/posting embeddings for fast-filter matching |

## UI & Styling

| Component | Technology | Notes |
|---|---|---|
| CSS | Tailwind CSS 4 | |
| Primitives | Radix UI | Alert dialog, avatar, slot, tabs |
| Icons | Lucide React | |
| Dark mode | next-themes | |
| Variants | class-variance-authority | |
| Animations | Rive (`@rive-app/react-webgl2`) | |

## PWA

| Component | Technology | Notes |
|---|---|---|
| Service worker | Serwist (`@serwist/next`) | Runtime caching, auto-update |

## Testing

| Component | Technology | Notes |
|---|---|---|
| E2E | Playwright | |
| Unit/integration | Vitest | |
| Component | React Testing Library | |

## Development

| Component | Technology | Notes |
|---|---|---|
| Language | TypeScript 5 | |
| Linting | ESLint 9 | Next.js config |
| Deployment | Vercel | Hosting + CI |
| DB management | Supabase CLI | Migrations, local dev |

## Approach

- Specification-driven development (see [README.md](README.md) for spec structure)
- Pre-commit hooks: Prettier + ESLint via lint-staged
- CI pipeline: lint, typecheck, unit tests, E2E tests, build
- Dual Supabase environments: test/staging + production
