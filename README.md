# Mesh

[![CI](https://github.com/AJB-ajb/MeshIt/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/AJB-ajb/MeshIt/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen)
![pnpm](https://img.shields.io/badge/pnpm-10.x-orange)

> AI-powered project collaboration matching platform

Mesh helps developers and creators find the perfect collaborators for their projects using AI-powered matching based on skills, interests, availability, and collaboration style.

## Tech Stack

- **Frontend**: Next.js 16 (App Router, Turbopack), React 19, TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS 4.x, shadcn/ui
- **Database**: Supabase PostgreSQL + pgvector
- **Auth**: Supabase Auth (Google, GitHub, LinkedIn, Slack, Discord)
- **AI/ML**: Gemini 2.0 Flash, OpenAI Embeddings, LangChain.js
- **Email**: Resend
- **Testing**: Vitest (unit), Playwright (E2E)
- **Hosting**: Vercel

## How to Run

### Prerequisites

- **Node.js** 18.17 or later
- **pnpm** 8.x or later (required - npm/yarn not supported)

```bash
# Install pnpm via corepack (recommended, comes with Node.js 16.13+)
corepack enable
corepack prepare pnpm@latest --activate
```

### Setup

```bash
# Clone the repo
git clone https://github.com/your-team/meshit.git
cd meshit

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Add your API keys to .env.local (see below)

# Run the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `.env.example` to `.env.local` and configure the following:

**Required**:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (server-side only)
- `GOOGLE_AI_API_KEY` — Google AI API key (Gemini)
- `OPENAI_API_KEY` — OpenAI API key (Embeddings)
- `RESEND_API_KEY` — Resend API key (email)

**Optional**:

- `NEXT_PUBLIC_POSTHOG_KEY` — PostHog analytics key
- `NEXT_PUBLIC_POSTHOG_HOST` — PostHog host URL
- `SENTRY_DSN` — Sentry error tracking DSN

## Details

### Available Scripts

| Command               | Description                             |
| --------------------- | --------------------------------------- |
| `pnpm dev`            | Start development server with Turbopack |
| `pnpm build`          | Build for production                    |
| `pnpm start`          | Start production server                 |
| `pnpm lint`           | Run ESLint                              |
| `pnpm test`           | Run unit tests in watch mode            |
| `pnpm test:run`       | Run unit tests once                     |
| `pnpm test:coverage`  | Run unit tests with coverage report     |
| `pnpm test:e2e`       | Run Playwright E2E tests                |
| `pnpm test:e2e:ui`    | Run E2E tests with Playwright UI        |
| `pnpm test:e2e:debug` | Run E2E tests in debug mode             |

### Project Structure

```
meshit/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth routes (login, callback)
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Home page
│   │   └── globals.css        # Global styles
│   ├── components/
│   │   └── ui/                # shadcn/ui components
│   ├── lib/
│   │   ├── ai/                # AI services (LangChain, Gemini, OpenAI)
│   │   ├── email/             # Email templates (Resend)
│   │   ├── github/            # GitHub integration
│   │   ├── supabase/          # Supabase client/server
│   │   └── utils.ts           # Utility functions (cn, etc.)
│   └── test/
│       └── setup.ts           # Vitest setup
├── tests/
│   ├── e2e/                   # Playwright E2E tests
│   └── fixtures/              # Test fixtures
├── public/                    # Static assets
├── _bmad-output/              # Planning & implementation docs
├── docs/                      # Project documentation
└── spec/                      # Specifications
```

### Deployment

Deploy to [Vercel](https://vercel.com) (recommended). See [Vercel Deployment Guide](./docs/VERCEL_DEPLOYMENT.md) for detailed instructions.

### Documentation

- [Vercel Deployment Guide](./docs/VERCEL_DEPLOYMENT.md)
- [Architecture](./_bmad-output/planning-artifacts/architecture.md)
- [PRD](./_bmad-output/planning-artifacts/prd.md)
- [Epics & Stories](./_bmad-output/planning-artifacts/epics.md)

## License

Private - All rights reserved
