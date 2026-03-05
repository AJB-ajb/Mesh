# Use Cases

This document illustrates Mesh use cases across the spectrum — from flat single-meeting postings to nested group coordination. Each case shows which negotiations Mesh resolves and how context inheritance reduces effort.

See [nested-postings.md](nested-postings.md) for the architectural model, [matching.md](matching.md) for matching, [scheduling-intelligence.md](scheduling-intelligence.md) for scheduling.

---

## Example Postings

These examples illustrate the variety of matching scenarios:

- "AI safety project, Master's level, preference for pair programming, Hamburg, weekends, 10-20h/week, preferred hours 18-22"
- "Theatre project, 4 weeks, all skill levels, evenings/weekends"
- "Course project collaborator, in-person, weekends, 2h direct collaboration"
- "Negotiation practice partner, online, today, 16+"
- "Hackathon teammate for the XHacks hackathon, any skill level, remote, full weekend, posting till in 2 days"
- "Course project partner for data-structures and algorithms, collaboration style: no collaboration, just handing in together, 2+h/week, any skill level"
- "Going for a classical concert some time this week, searching for a local companion with experience"
- "Looking for a tennis partner for weekend matches, intermediate level, Hamburg area"

---

## Flat Use Cases (No Nesting)

### Sequential invite: asking one connection at a time

**Problem**: I want to do something with one of my connections. I message Alice — she's busy. I message Ben — no reply for 2 hours. I message Carla — she's interested but can't do the time I suggested. Three conversations, an hour of waiting, and we haven't even settled on a plan.

**With Mesh**: Create a posting, select and rank 5 connections, send sequential invites. The system sends them one by one (or N at a time). Calendar-busy connections are auto-skipped. The first one who accepts is matched. One action replaces three conversations.

**Negotiations resolved**: who (invite order), when (calendar overlap at acceptance), where (specified in posting). All resolved without back-and-forth.

### Finding a stranger for a specific activity

**Problem**: I want a tennis partner for Saturday but none of my friends play. I'd need to post in multiple groups, explain what I'm looking for each time, then compare who replied.

**With Mesh**: Post "Tennis Saturday afternoon, intermediate, near Englischer Garten." Matching finds compatible people by skill level, location, and availability. Acceptance flow confirms the exact time from calendar overlap. One posting, no group-spamming.

**Negotiations resolved**: who (matching), when (scheduling intelligence), where (location matching). What and how many were specified in the posting.

---

## Nested Use Cases (Groups & Channels)

### Hackathon team: from channel to coordinated team

**The full arc**: An organizer creates an "XHacks 2026" posting (channel). 200 participants join via QR code at the venue. Discovery within the channel is scoped to members.

**Step 1 — Finding teammates (child posting in channel)**:
A participant posts within XHacks: "Building an accessibility checker — need a designer and a backend dev." Matching runs on the 200 channel members, weighted toward skills. Three people join.

**Step 2 — Coordinating the team (child posting in group)**:
The team of 4 is now a group. Someone posts within the group: "Pre-hackathon planning call — 30 min this week?" The system knows the audience (the 4 team members), checks 4-way calendar overlap, generates time slots. Each member gets a one-tap RSVP. No "when works for everyone?" thread.

**Step 3 — Task assignment (child posting in group)**:
During the hackathon: "Who's handling the Figma mockups by tonight?" Posted within the group. The system can even suggest a team member based on profile skills. Simple "I'll do it" response.

**What nesting provides**: The channel scoped discovery to relevant people. The group scoped coordination to the team. Each child posting inherited context — participants, project topic, location — so the poster only had to write the new thing they needed.

**Negotiations resolved at each level**:

- Channel level: who is in scope (channel members)
- Team posting: who specifically (matching on skills within channel), what (the project)
- Planning call: when (calendar overlap on the known team)
- Task assignment: who does what (within the known team and project)

### Recurring practice: weekly group with per-session coordination

**The full arc**: Someone creates "Weekly Spanish practice — conversational, beginner-friendly, Tuesdays evening, Cafe Fruhling near Uni." This stays open as a standing group. New people discover it and join over time.

**Each week**: A child posting is created (one tap or auto via `/recur`): "This Tuesday's session." The system sends RSVPs to the group. Calendar overlap narrows the exact time (18:00 vs. 18:30). Members confirm with one tap.

**A member can't make it one week**: They decline the RSVP. The group sees "3 of 4 coming this week." No "sorry guys I can't make it this week" message thread needed.

**A new member joins the parent**: They start getting weekly RSVPs. The system already knows the what, where, and roughly when — the new member only needs to confirm availability.

**What nesting provides**: The parent posting holds the stable context (what, where, recurring pattern, the group). Each weekly instance only negotiates what's new: exact time, who's coming this week. The effort per week is near zero — one tap to confirm.

### Course project: semester-long team coordination

**The full arc**: "Data Structures course project — need 2 partners, Prof. Muller's section, deadline June 15, ~10h/week." Two partners join via matching. The group persists for the semester.

**Finding a weekly sync**: Someone posts within the group: "Weekly sync — when works for everyone?" The system finds the best recurring slot from 3-way calendar overlap and proposes it. One round of confirmation instead of a week of "how about Tuesday?" "no, Wednesday?" messages.

**Specific working session**: "Working session for Assignment 3 — this weekend at the library?" Inherits the team, negotiates only the new dimensions: specific time, specific place.

**What nesting provides**: The project context (course, team, deadline, roughly how much time) is established once. Every child posting builds on it. The team doesn't re-negotiate who they are or what they're working on for each meeting.

### Mentorship program: organization-scoped matching

An AI safety organization creates "AI Safety Mentorship — Spring 2026 cohort" (channel). Mentors and mentees join via invite link.

Mentors post within the channel: "Available for 2h/week — experience in alignment research and interpretability." Mentees post: "Looking for a mentor in interpretability, 1h/week." Matching runs within the channel, weighted toward skill level complementarity and interest alignment. Verified credentials (GitHub, LinkedIn) influence match quality.

Once matched, the mentor-mentee pair becomes a small group. They coordinate session times via child postings — each one inheriting the context (mentorship, the specific focus area, both participants).

---

## The Pattern Across Use Cases

Every use case involves the same set of negotiations — who, when, where, what, how many — that messaging apps force into back-and-forth. Mesh resolves them through matching, scheduling intelligence, and context inheritance.

The key difference between use cases isn't a type distinction — it's **which negotiations dominate** and **how many rounds** are needed:

| Use case             | Primary negotiation                 | Rounds                                    | Nesting                          |
| -------------------- | ----------------------------------- | ----------------------------------------- | -------------------------------- |
| Spontaneous coffee   | When (scheduling)                   | 1                                         | Flat                             |
| Tennis with stranger | Who + when                          | 1                                         | Flat                             |
| Hackathon team       | Who + what (roles, vision)          | 1-2                                       | Channel -> group                 |
| Recurring practice   | When (per instance)                 | Ongoing, but each round is 1 tap          | Parent -> weekly children        |
| Course project       | Who initially, then when repeatedly | Ongoing                                   | Parent -> children over semester |
| Mentorship           | Who (deep compatibility)            | 1 for matching, then ongoing for sessions | Channel -> pair -> sessions      |

Nesting reduces effort over time: the first posting requires describing everything, but subsequent coordination within the group is nearly frictionless because the context is already established.
