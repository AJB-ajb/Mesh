# Mesh

Platform for effective activity coordination in small groups — finding the right people for projects, activities, and spontaneous plans.

## Status

- **Current**: v0.5 — deep matching, multi-role matching, match explanations
- **Next**: v0.6 — engagement & polish (ghost text, markdown edit mode, N-sequential invites, auto-translation)

See [roadmap.md](roadmap.md) for milestone tracking. See [text_first_rewrite.md](../.prompts/text_first_rewrite.md) for the text-first spec that drives v0.3+.

## Problem

People coordinate activities through messaging apps, email, and in-person conversations. This doesn't work well:

- **High friction.** Finding people means messaging connections one by one or scanning Slack/WhatsApp channels — lots of back-and-forth.
- **Broadcasting is wasteful.** Messaging in large groups shows 100 people a message where only 5 are interested.
- **Wrong unit of organization.** Messaging apps are about messages. Mesh is about activities. The activity posting is the fundamental unit, not a thread of messages.
- **Compatibility is invisible.** Skill levels, work style preferences, and scheduling availability are rarely explicit in current tools.

### Approach

- Activity-first: start with what you want to do, then find people
- Fast setup: post in 30 seconds, no profile required
- Natural language: describe your activity like you would in a chat message; AI extracts structure

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
- **Spontaneous activities**: Asking connections for quick plans with fast deadlines and invites (sequential or parallel)

See [vision.md](vision.md) for detailed analysis of each audience.

### Particular Use Cases

- Hackathon teammates
- Course project partners
- Social activities (concert companion, tennis partner, board game night)
- Spontaneous plans ("negotiation practice partner, online, today")
- Invite: order connections by preference (sequential) or invite all at once (parallel)
- Finding someone from a larger group (classmates, community) without a specific person in mind

## Features

See [ux.md](ux.md) for design principles, pages, and interaction patterns.

### Use Cases

- Find people for a project
- Find people for a social activity
- Find a specific person from your connections for a plan (invite)
- Find someone suitable from a larger group without a specific person in mind

See [use-cases.md](use-cases.md) for detailed examples and scenarios.

### Matching

See [matching.md](matching.md) for the matching algorithm.

### Core

- Fast posting (paste from Slack/WhatsApp, AI extracts features)
- Posting keywords for similarity matching
- One-click OAuth login, no setup required
- Notifications: daily digest + instant for high matches
- _Invite_: sequential (one-by-one) or parallel (all at once) invite mode for connections

### Future

See [roadmap.md](roadmap.md) for the full milestone plan. Key upcoming features:

- **Text-first posting & profiles** (v0.3) — single text field replaces multi-step forms
- **Smart input** (v0.4) — slash commands, quick chips, auto-format/clean, post-write nudges
- **LLM deep matching** (v0.5) — Stage 2 matching with full-text evaluation and match explanations
- **Auto-translation** (v0.6) — multilingual posting support
- Calendar sync (v1.0) — Google Calendar / iCal integration
- Channels (v1.0) — shared posting contexts for hackathons, courses, communities
- Verification — GitHub, LinkedIn profile linking and badges
- Rating system — objective phrasing, no visible aggregate scores

## Design Principles

See [ux.md](ux.md).

## Motivation

- Collaboration is a core human need, but coordinating it is unreasonably hard
- Small teams (2-5) outperform large groups for most tasks — yet current tools serve crowds, not small groups
- 1:1 and pair coordination is the most common case but the least served by existing tools
- Current tools (Slack, WhatsApp, email) are built around messages, not activities — they don't scale for matching or coordination
- Mesh is both a coordination tool (for people you know) and a matching tool (for people you don't yet know), unified under a single activity-first interface

See [vision.md](vision.md) for deeper philosophy, insights, and target audience analysis.

## Competitors

- Meetup.com, Facebook groups: focus on large groups, high friction

## Monetization

LLM invocations are a real cost. Tiered access keeps the product viable. See [text_first_rewrite.md](../.prompts/text_first_rewrite.md) §9 for detail.

- **Free tier**: full posting, fast-filter matching, deep match for top N matches, standard LLM model
- **Premium**: unlimited deep matching, full match explanations, priority placement, LLM-assisted logistics
- **LLM cost tiering**: cheap models for ghost text/chips, mid-tier for extraction/formatting, high-tier for deep matching

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
