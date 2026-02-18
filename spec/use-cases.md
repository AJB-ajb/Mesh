## Example Postings

New spec:

- Idea-based social platform for quickly asking people to do stuff together and finding people on an idea/project level.
  - Goals:
    - Minimize friction for finding random people fast
    - Minimize back-and-forth messaging
    - Maximize matching efficiency (speed, success).
    - should allow meeting new people effectively with idea focus

These examples illustrate the variety of matching scenarios:

- "AI safety project, Master's level, preference for pair programming, Hamburg, weekends, 10-20h/week, preferred hours 18-22"
- "Theatre project, 4 weeks, all skill levels, evenings/weekends"
- "Course project collaborator, in-person, weekends, 2h direct collaboration"
- "Negotiation practice partner, online, today, 16+"
- "Hackathon teammate for the XHacks hackathon, any skill level, remote, full weekend, posting till in 2 days"
- "Course project partner for data-structures and algorithms, collaboration style: no collaboration, just handing in together, 2+h/week, any skill level"
- "Going for a classical concert some time this week, searching for a local companion with experience"
- "Looking for a tennis partner for weekend matches, intermediate level, Hamburg area"

## Use Cases

- Case: I want to do something together with exactly one connection. I need to ask one connection. If this connection isn't available, I ask another. This requires significant back-and-forth messaging.
  - This is a fundamental problem emerging when searching for a limited number of people (here: 1) in a larger group (here: connections).
  - Ordering connections might seem unusual, but it is a natural way to express preference that is already used in many contexts.
  - Functionality: "Sequential Invite"; Select and order connections to invite; Send invites one by one until enough accept or all decline.

- Case: I want to do something together with exactly one person, but I don't have a specific person in mind. I want to find a suitable person from a larger group (e.g., colleagues, classmates, community members).

## Target Audience Scenarios

- Case: **Hackathon with channel.** An organizer creates a channel for "XHacks 2026" with defaults (expiry: event end, category: Hackathon). Participants join via QR code at the venue. They post team-finding requests within the channel context, and matching is scoped to channel members.

- Case: **Spontaneous activity with sequential invites.** A user wants to play tennis this afternoon. They create a posting with a 4-hour deadline and select 5 connections ordered by preference. The system sends invites one by one. If a connection's calendar shows they're busy, they're auto-skipped. The first available connection who accepts is matched.

- Case: **Mentorship matching.** An AI safety organization creates a channel for their mentorship program. Mentors and mentees post profiles with verified credentials (GitHub, LinkedIn). The matching algorithm weighs skill level complementarity (mentor should be significantly more experienced) and interest alignment.
