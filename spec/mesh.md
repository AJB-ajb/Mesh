# Mesh

Platform for effective activity coordination in small groups — finding the right people for projects, activities, and spontaneous plans.

## Status

- **Current**: v0.5 — deep matching, multi-role matching, match explanations
- **Next**: v0.6 — engagement & polish (ghost text, markdown edit mode, N-sequential invites, auto-translation)

See [roadmap.md](roadmap.md) for milestone tracking. See [text_first_rewrite.md](../.prompts/text_first_rewrite.md) for the text-first spec that drives v0.3+.

## Problem

Activity coordination through messaging apps means excessive back-and-forth:

- **Rounds of messaging.** Explaining what you want, checking interest, negotiating availability, comparing fit — one person at a time, one message at a time. Each round trip takes minutes to hours.
- **People drop out mid-coordination.** Someone says "maybe" on Monday and ghosts by Wednesday. Momentum dies.
- **Broadcasting is wasteful.** Posting in a large group shows 100 people a message where only 5 are interested.
- **Details scatter.** What started as "let's do X" becomes logistics spread across DMs, threads, and group chats.
- **The root cause:** Messaging apps treat everything as a message. They don't know you're coordinating an activity, so they can't help — they can't check availability, match skills, or manage group formation.

### Why it's hard: multi-dimensional negotiation

Every activity requires negotiating multiple dimensions — who, when, where, what exactly, how many people — and the dimensions interact. A different "when" changes who can come. A different "who" changes what you can do. Messaging apps force each dimension into a separate round of back-and-forth, with no memory of what's already been decided.

Mesh substitutes these negotiations: matching handles **who**, calendar overlap handles **when**, location matching handles **where**, deep matching + acceptance prompts handle **what**, team size + waitlist handle **how many**. A posting captures what you want; the system resolves the rest. See [vision.md](vision.md) for the full philosophy.

For ongoing activities (projects, recurring meetings, hackathon teams), these negotiations happen in layers. The first posting establishes a group — resolving who and what. Subsequent postings within that group only negotiate what's new (when to meet this week, who handles which task). Context carries forward so each round of coordination takes less effort. See [nested-postings.md](nested-postings.md).

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

### Nested Postings & Contexts

See [nested-postings.md](nested-postings.md) for how postings nest as coordination contexts — replacing channels, context identifiers, and recurring instances with a single parent-child model.

### Core

- Fast posting (paste from Slack/WhatsApp, AI extracts features)
- Posting keywords for similarity matching
- One-click OAuth login, no setup required
- Notifications: daily digest + instant for high matches
- _Invite_: sequential (one-by-one) or parallel (all at once) invite mode for connections

### Future

See [roadmap.md](roadmap.md) for the full milestone plan. Key upcoming features:

- **Text-first rendering & syntax** (v0.6) — `mesh:` links, `||hidden||`, unified PostingCard, text-first profile redesign
- **Command palette & coordination** (v0.7) — expanded slash commands, link invites, repost
- **Smart acceptance & calendar** (v0.8) — LLM-generated acceptance flow, calendar overlap time slots
- **Auto-translation** (v1.1) — multilingual posting support
- Calendar sync (v1.0) — Google Calendar / iCal integration
- Channels (v1.0) — shared posting contexts for hackathons, courses, communities. Subsumed by nested posting model; see [nested-postings.md](nested-postings.md)
- Verification — GitHub, LinkedIn profile linking and badges
- Rating system — objective phrasing, no visible aggregate scores

## Design Principles

See [ux.md](ux.md).

## Motivation

- Coordinating activities is unreasonably hard — back-and-forth messaging is the bottleneck, not finding the activity itself
- Messaging apps can't help because they treat everything as text — they don't understand the structure of an activity (time, place, skills, team size)
- Mesh leverages that structure: because a posting is an activity, the platform can automate what messaging can't — check availability, match skills, manage invites, form groups
- Small teams (2-5) outperform large groups for most tasks — yet current tools serve crowds, not small groups
- Mesh is both a coordination tool (inviting people you know) and a matching tool (finding people you don't yet know), unified under a single activity-first interface
- Coordination is multi-dimensional negotiation (who, when, where, what, how many) — Mesh resolves each dimension through intelligent mechanisms, replacing rounds of messaging with structured actions
- For ongoing activities, context carries forward: once a group is formed, subsequent coordination inherits what's already decided, making each round nearly frictionless

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
