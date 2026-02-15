# Mesh

Idea-based social platform for quickly finding people to do things with — projects, activities, and spontaneous plans.

## Status

<!-- Link epics here as they are created. Check off when fully implemented. -->
<!-- - [ ] #42 Posting creation flow -->
<!-- - [ ] #43 Matching algorithm v1 -->

## Problem

- Finding people to do things with requires high effort (scanning Slack/WhatsApp channels, messaging friends one by one)
- Large communities don't scale for individual matching
- Skill levels and personal compatibility are rarely explicit

- Idea first approach
- Fast setup first approach
- Natural language interface

### Key Issues

- Adoption, fast usability
- High responsiveness — postings should be fresh and active

## Scope

- Primary: Small groups (2-5 people), especially pairs
- Projects, activities, and social plans are all first-class posting types
- Don't artificially limit applicability

### Target Audiences

- **Academic collaboration**: Finding the right subset of collaborators for specific tasks
- **Course projects**: Matching on work style, skill level, and interest alignment
- **People upskilling**: Finding learning partners and coordinating schedules
- **Professional upskilling / mentorship**: Matching mentors and mentees (e.g., AI safety orgs)
- **Hobbyists**: Game dev, writing, art, theater — finding collaborators
- **Hackathons**: Finding aligned teammates; channels as shared context with QR codes
- **Spontaneous activities**: Asking connections for quick plans with fast deadlines and sequential invites

See [vision.md](vision.md) for detailed analysis of each audience.

### Particular Use Cases

- Hackathon teammates
- Course project partners
- Social activities (concert companion, tennis partner, board game night)
- Spontaneous plans ("negotiation practice partner, online, today")
- Sequential Invite: order connections by preference, send invites one-by-one until enough accept
- Finding someone from a larger group (classmates, community) without a specific person in mind

## Features

See [ux.md](ux.md) for design principles, pages, and interaction patterns.

### Use Cases

- Find people for a project
- Find people for a social activity
- Find a specific person from your connections for a plan (sequential invite)
- Find someone suitable from a larger group without a specific person in mind

See [use-cases.md](use-cases.md) for detailed examples and scenarios.

### Matching

See [matching.md](matching.md) for the matching algorithm.

### Core

- Fast posting (paste from Slack/WhatsApp, AI extracts features)
- Posting keywords for similarity matching
- One-click OAuth login, no setup required
- Notifications: daily digest + instant for high matches
- _Sequential Invite_: ordered invite mode for 1:1 invites until enough accept

### Future

- Calendar integration (auto-suggest time slots / auto update availability)
- Location suggestions
- Verification (GitHub, LinkedIn for professional postings)
- Rating system (objective phrasing, no visible aggregate scores, honest feedback for growth)
- AI-based user interface
  - Navigate, search and filter via natural language
  - Automatically translates to UI actions
- Mentor / mentee matching
- Channels (shared context for hackathons, courses, communities — with setup defaults like expiry and category)
- QR code and share link generation for channels and postings
- Project images
- Markdown-first interface (markdown input/output, copy as markdown, auto-format, handoff document export)
- AI agent integration via markdown interface
- Test / staging database environment for user research

## Design Principles

See [ux.md](ux.md).

## Motivation

- Collaboration is a core human need
- 1:1 coordination is common but poorly served by current tools
- Small teams (2-4) outperform large groups for most tasks
- Current tools (Slack, WhatsApp) don't scale for matching
- Pair work is undervalued and underutilized

See [vision.md](vision.md) for deeper philosophy, insights, and target audience analysis.

## Competitors

- Meetup.com, Facebook groups: focus on large groups, high friction

## Monetization

- Free tier (full functionality)
- Business tier (company usage)
- Premium: analytics, internal rating access

## Tech Stack

### Core

- **Next.js 16.1.6** (TypeScript, App Router)
- **React 19.2.3**
- **pnpm 10.28.1** (package manager)
- **fnm** (Node.js version manager)

### Database & Backend

- **Supabase** (PostgreSQL-based)
  - `@supabase/supabase-js` - Client library
  - `@supabase/ssr` - Server-side rendering support
  - Supabase Auth (OAuth: Google, GitHub, LinkedIn)
  - Real-time subscriptions

### AI

- **Google Gemini** (`@google/generative-ai`) - AI text generation
- **OpenAI** - Embeddings, GPT integration

### UI & Styling

- **Tailwind CSS 4** - Styling framework
- **Radix UI** - Accessible component primitives
  - `@radix-ui/react-alert-dialog`
  - `@radix-ui/react-avatar`
  - `@radix-ui/react-slot`
  - `@radix-ui/react-tabs`
- **Lucide React** - Icon library
- **next-themes** - Dark mode support
- **class-variance-authority** - Component variants
- **Rive** (`@rive-app/react-webgl2`) - Animations

### PWA

- **Serwist** (`@serwist/next`) - Service worker management

### Testing

- **Playwright** (`@playwright/test`) - E2E testing
- **Vitest** - Unit/integration testing
- **React Testing Library** - Component testing

### Development Tools

- **TypeScript 5**
- **ESLint 9** with Next.js config
- **Vercel CLI** - Deployment tooling
- **Supabase CLI** - Database management

### Deployment

- **Vercel** - Hosting platform

## Development

### Approach

- Specification-driven

### Key Challenges

- Matching algorithm design
