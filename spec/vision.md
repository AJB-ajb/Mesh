# Vision & Philosophy

This document captures the high-level product philosophy, motivations, and strategic insights behind Mesh. It complements the technical specs ([mesh.md](mesh.md), [ux.md](ux.md), [matching.md](matching.md), [use-cases.md](use-cases.md)) with subjective and motivational reasoning.

## Why Not Messaging Apps?

Coordinating activities through messaging apps means rounds of back-and-forth: explaining what you want to do, checking who's interested, negotiating availability, comparing people's fit — one message at a time, one person at a time. Each round trip takes minutes to hours. People drop out mid-negotiation. Details scatter across threads and DMs. By the time you've coordinated, the moment may have passed.

The root cause: **messaging apps treat everything as a message.** They don't know you're coordinating an activity, so they can't help with the coordination. The activity itself — what, when, where, how many people, what skills — gets buried in a thread of replies.

Mesh treats the **activity posting** as the fundamental unit. Because a posting has structure, the platform can act on it: skip unavailable people, match on relevant dimensions, manage group formation, send invites in your preferred order. The back-and-forth is replaced by a single posting.

This serves two scenarios:

- **Finding new people** (matching): describe your activity, get matched with compatible people based on skills, availability, and interests.
- **Coordinating with people you know** (invites): post your activity, invite connections in order — the platform handles the asking, waiting, and fallback automatically.

## Coordination as Negotiation Substitution

Every activity involves multi-dimensional negotiation: who should come, when to meet, where, what exactly to do, how many people. In messaging apps, each dimension is a round of back-and-forth — and the dimensions interact (a different "when" might change "who" can come, which changes "what" you can do together).

Mesh substitutes these negotiations with intelligent mechanisms:

- **Who** -> matching (finding compatible people) + invites (asking in the right order)
- **When** -> calendar overlap + LLM-generated time slots
- **Where** -> location matching + post-accept detail reveal
- **What exactly** -> deep matching on text + interactive acceptance prompts
- **How many** -> team size + waitlist

The key insight: these negotiations happen at every scale — for a coffee date AND a hackathon team AND a semester-long project. The difference is which dimensions dominate and how many rounds are needed. A coffee date resolves everything in one step. A hackathon team resolves "who" first, then "when to meet" repeatedly over the event.

This is why postings nest. A posting is a coordination context — a bundle of negotiations, some resolved, some open. When the initial negotiations are resolved (team formed, project defined), new ones emerge (when to meet this week, who handles which task). A child posting inherits what's already resolved and focuses on what's new. Each level of nesting reduces effort because the system carries forward everything that's already been decided.

The result: coordination that would take dozens of messages — spread across days, losing momentum — collapses into a few taps. Not because the app is doing something magical, but because it understands the structure of what's being negotiated and can act on it.

See [nested-postings.md](nested-postings.md) for the technical model. See [use-cases.md](use-cases.md) for walkthroughs.

## Effectiveness Over Engagement

Many apps optimize for engagement — time spent in app. Mesh optimizes for effectiveness — getting things done. The app should be pleasant to use, but not addictive. People should be able to coordinate quickly and then move on with their lives.

This belief shapes design decisions: no infinite feeds, no engagement-maximizing notifications, no dark patterns that keep people scrolling.

## Core Insight: Small Groups

Most useful activities have an optimal number of participants — typically 2 to 5.

- **Communication overhead scales badly.** In a one-hour conversation with 2 people, each person speaks ~30 minutes. With 10 people, each person speaks ~6 minutes. Assuming speaking time as a proxy for learning, a 10-person conversation is ~1/5 as effective as a 2-person one.
- **Coordination costs dominate at scale.** Decision-making bottlenecks, scheduling conflicts, and consensus-seeking all grow faster than group size.
- **Open-number meetings are a different problem.** "Invite everyone, let them self-select" works for events but not for collaboration. Most meetup tools serve the former; Mesh serves the latter.

Mesh is designed for small postings — finding the right 1-4 people, not gathering a crowd.

## Collaboration Preferences & Social Dynamics

- **Joint vs. solo work is a fundamental preference.** Some people prefer to work alone and consult others as needed. Others strongly prefer thinking jointly (whiteboarding, pair programming). This is one of the most significant interpersonal differences in collaborative work.
- **Collaborator preferences are real but unstated.** In society, it's discouraged to say "I don't want to work with person X," but people have strong preferences that significantly impact motivation and productivity.
- **"I have time for X with Y" is really a preference statement.** It means "I have a sufficient preference for activity X with person Y to spend time on this." Mesh should make these implicit preferences explicit and actionable.

## Target Audiences

### Academic Collaboration

Researchers often collaborate on projects with many people. A collaboration and ask tool is useful for finding the right subset of collaborators for specific tasks.

### Course Projects

Finding collaborators for course projects is challenging. Work style, skill level, and interest alignment all matter. These are small-number scenarios (small courses) where we want near-complete matching.

### People Upskilling

People learning new skills often want to find others to learn with, but finding the right people and coordinating schedules is hard.

### Professional Upskilling & Mentorship

Organizations (e.g., in AI safety) want to match mentors and mentees. This often looks like an application scenario — many applicants vs. few mentors — so verifiable credentials in profiles are useful. Skill levels should be approximately normalized.

### Hobbyists

People working on hobbies (game development, writing, art, theater) want collaborators but struggle to find them and coordinate schedules.

### Hackathons

Hackathons are great for collaboration but finding teammates aligned on a vision is hard.

- The hackathon itself is a parent posting (channel) — a shared context with event defaults (expiry, category). Participants join via QR code or share link.
- Team-finding posts are child postings within the channel. Matching is scoped to channel members, so candidates are all at the same event.
- Once a team forms, it becomes a group. Team coordination (planning calls, task assignment) happens via child postings within the group — each one inheriting the team context.
- This is a natural two-level nesting: channel -> team -> coordination within team.

### Spontaneous Activities

Asking connections for spontaneous activities (e.g., "learn topic X together today"):

- Small expiry times, easy scheduling, sequential invites
- Calendar integration for auto-rejection if unavailable
- Good mobile UX, notifications, location awareness, privacy

## Product Goals

- **High adoption is critical.** The product requires network effects to work.
- **30-second onboarding.** A not-yet-registered user with a written posting description should be able to post in under 30 seconds: click "Post" on hero → OAuth login → paste description → post.
- **No personal configuration required to post.** Personal profile setup can improve matching quality but must not be a gate.

## Why AI Matching?

Matching people and activities is intelligence-complete. No rigid set of forms, filters, and categories can capture the full space of what makes two people good collaborators for a specific activity.

- Some matchings work perfectly. Some would work with small adaptations. Some don't work at all. You need reasoning to tell which is which.
- Language models can do this reasoning — and they improve each month.
- Mesh uses AI not as a gimmick but as the core mechanism that makes multi-dimensional matching feasible at all: evaluating compatibility across skills, work style, availability, location, and the nuances in natural-language descriptions that structured data can't capture.

## Design Inspiration

- **Luma**: Fast, undistracting usability. Feels modern and elegant. Good calendar integration.
