# Vision & Philosophy

This document captures the high-level product philosophy, motivations, and strategic insights behind Mesh. It complements the technical specs ([mesh.md](mesh.md), [ux.md](ux.md), [matching.md](matching.md), [use-cases.md](use-cases.md)) with subjective and motivational reasoning.

## Core Insight: Small Groups

Most useful activities have an optimal number of participants — typically 2 to 5.

- **Communication overhead scales badly.** In a one-hour conversation with 2 people, each person speaks ~30 minutes. With 10 people, each person speaks ~6 minutes. Assuming speaking time as a proxy for learning, a 10-person conversation is ~1/5 as effective as a 2-person one.
- **Coordination costs dominate at scale.** Decision-making bottlenecks, scheduling conflicts, and consensus-seeking all grow faster than group size.
- **Open-number meetings are a different problem.** "Invite everyone, let them self-select" works for events but not for collaboration. Most meetup tools serve the former; Mesh serves the latter.

Mesh is designed for small postings — finding the right 1-4 people, not gathering a crowd.

## Work Style & Social Dynamics

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

- **Channels** are important: a shared context for a specific event, with setup defaults (e.g., expiry, category).
- **Share links and QR codes** for easy channel joining.

### Spontaneous Activities

Asking friends for spontaneous activities (e.g., "learn topic X together today"):

- Small expiry times, easy scheduling, cascading invites
- Calendar integration for auto-rejection if unavailable
- Good mobile UX, notifications, location awareness, privacy

## Product Goals

- **High adoption is critical.** The product requires network effects to work.
- **30-second onboarding.** A not-yet-registered user with a written project description should be able to post in under 30 seconds: click "Post project" on hero → OAuth login → paste description → post.
- **No personal configuration required to post.** Personal profile setup can improve matching quality but must not be a gate.

## Design Inspiration

- **Luma**: Fast, undistracting usability. Feels modern and elegant. Good calendar integration.
