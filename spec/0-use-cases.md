# Use Cases

> Mesh replaces the back-and-forth messaging that dominates real-world coordination — finding people, negotiating times, exchanging logistics — with structured flows that resolve these negotiations in one or two taps.

**Note**: Some features in the case studies below are not yet implemented — they describe the target UX, not the current implementation. This is Layer 0: the world we are building toward.

See [1-nested-postings.md](1-nested-postings.md) for the architectural model, [1-matching.md](1-matching.md) for matching, [1-scheduling.md](1-scheduling.md) for scheduling.

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
- "Grabbing coffee near Marienplatz, anyone want to join? Chill chat, interested in tech or philosophy. Next hour or so."
- "Quick call about the API redesign? 15 min."
- "Chess. Intermediate. Munich."

---

## Flat Use Cases (No Nesting)

### Coffee Now — spontaneous meetup in 15 seconds

**The problem**: I want to grab coffee with someone interesting. I message Alice — she's busy. I message Ben — no reply for 2 hours. I message Carla — she's interested but can't do the time I suggested. Three conversations, an hour of waiting, and we haven't even settled on a plan.

**With Mesh**: User types:

> Grabbing coffee near Marienplatz, anyone want to join? Chill chat, interested in tech or philosophy. Next hour or so.

The system extracts location, time, vibe. Quick chips confirm coordinates with one tap. The posting is live in ~15 seconds (vs. ~2 minutes with a form-first approach). Background extraction picks up "tech or philosophy" as matching signals — no form field could capture this.

**Matching**: Fast filter narrows to users within 1km, calendar free now. Deep match uses "tech or philosophy" to rank candidates by profile affinity (an ML researcher who's into philosophy of mind scores 0.88; a startup founder who's "always up for a coffee chat" scores 0.79).

**Sequential invite**: One spot, time-sensitive. The poster ranks 3 matches. Lena gets invited first. If she passes, Marco gets auto-invited — no action needed from the poster. If Lena accepts, Marco and Priya are never bothered. One action replaces three conversations.

**Why sequential here**: If all 3 were invited in parallel and two accepted, one would get a "spot taken" rejection. For a 1-spot spontaneous coffee, that feels rude. Sequential avoids this.

**Negotiations resolved**: who (invite order), when (calendar overlap at acceptance), where (specified in posting). All resolved without back-and-forth.

### Spanish Conversation Partner — nuance that no form captures

**The problem**: I want a language practice partner with specific requirements — level, style, shared interests — but I'd describe them naturally, not in form fields.

**With Mesh**: User types:

> Looking for a Spanish conversation partner, ideally someone at B1-B2 level so we can actually have real conversations (not just "hola, me llamo..."). I'm B2 myself, trying to get to C1 before a trip to Colombia in March.
>
> Prefer meeting in person in Munich, maybe a cafe or park. Weekday evenings work best, like 18-20h. Once or twice a week.
>
> Would be great if you're into travel or music — gives us something to actually talk about beyond grammar drills.

The system extracts CEFR levels (B1-B2) for fast filtering. But the _context_ around them — "so we can actually have real conversations" — drives the deep match. "Trip to Colombia" is matching gold: a native speaker from Bogota who loves salsa scores 0.92; a C2-certified grammar teacher with no shared interests scores 0.61.

**Dual-track invite**: Sequential invite runs for top matches AND the posting stays open on Discover. An organic applicant (Carlos) requests to join and is waitlisted. When the sequential match (Ana) later withdraws, Carlos is auto-promoted from the waitlist — his application wasn't wasted.

**Negotiations resolved**: who (deep matching on level + interests + reciprocity), when (weekday evenings from posting), where (Munich, in-person). The nuance "not just hola, me llamo..." tells the matcher this person wants real conversation, not drills — a style constraint only text can express.

### Short Film Crew — multi-role from a single posting

**The problem**: A film student needs an actor, a sound person, and a colorist for a weekend shoot. With messaging, that's three separate searches, each with its own "what skills? when? where?" conversation.

**With Mesh**: One posting describes all three roles naturally:

> **Weekend Short Film — Need a Small Crew**
>
> Shooting a 5-minute short film next Saturday-Sunday in Englischer Garten. Looking for:
>
> - **Actor/actress** — female, 20s-30s, comfortable with improvisation
> - **Sound person** — handheld boom mic, at least one short film before
> - **Someone who can do basic color grading** in DaVinci Resolve. Can be done remotely after the shoot.
>
> I'll direct and operate camera. No budget but I'll feed everyone and credit you properly.

The system extracts three distinct roles with separate matching criteria. The colorist role is flagged as remote-OK, relaxing the location filter for that role specifically. "Before Sunrise vibes" (from the full posting) surfaces candidates whose profiles mention arthouse or dialogue-heavy work — useless to a structured filter, valuable to a deep matcher.

**Parallel invite per role**: Three roles, each needing a different person. Invites go out in parallel across roles. A multi-role candidate (Sam: actor 0.72, sound 0.78) gets invites for both. When Julia gets the actor slot, Sam's actor invite is cancelled but their sound invite remains live. First-to-accept wins within each role — no negotiation needed.

**Negotiations resolved**: who (per-role matching), what (role extraction from text), when (confirmed dates), where (on-site vs. remote per role).

### Copy-Paste — from Slack to Mesh with zero reformatting

**The problem**: I already described what I need in a Slack channel. Now I have to re-enter it into a structured form.

**With Mesh**: User pastes a Slack message verbatim:

> hey does anyone know someone who's good with kubernetes? we're migrating our staging env from docker-compose to k8s and I keep running into networking issues with the ingress controller. not looking for someone to do it for me, more like pair programming / rubber duck debugging for a few hours this week. I can do mornings or after 17h. based in berlin but fully remote is fine too. happy to return the favor if you need help with python/fastapi stuff

User hits "Post." That's it. The system extracts skills needed (Kubernetes, ingress), skills offered (Python, FastAPI), format (pair programming), time, location. An optional auto-format tidies the presentation without changing the voice.

**Reciprocal matching**: "Happy to return the favor if you need help with Python/FastAPI" is detected as a skill exchange offer. The top match (Kai, 0.93) has "looking for Python help for a side project" in his profile — mutual benefit that only text + deep matching can discover.

**Negotiations resolved**: who (skill matching + reciprocity), when (mornings or after 17h), where (Berlin, remote OK), how ("pair programming, not outsourced" — a _style_ constraint no form field captures).

### Chess — three words and it works

**The problem**: What if I just want to play chess and can't be bothered to fill out a form?

**With Mesh**: User types:

> Chess. Intermediate. Munich.

The system extracts activity, skill level, location. Post-write nudges offer one-tap refinements: "When are you available?" `Morning | Afternoon | Evening | Pick date | Skip`. "In person or online?" `In person | Online | Both | Skip`. Each tap appends a word to the text — progressive refinement, not a form.

**Open + auto-accept**: This posting is so minimal that the natural flow is: leave it open on Discover, let people self-select. Thomas browses, sees "Chess — Intermediate, Munich, Evenings", taps "Join." He's in immediately. Two taps for the joiner, zero management for the poster.

**The lesson**: Three words produce a matchable posting. Richer text produces _better_ matches. The system works at any detail level but rewards richer input.

### Finding a stranger for a specific activity

**The problem**: I want a tennis partner for Saturday but none of my friends play. I'd need to post in multiple groups, explain what I'm looking for each time, then compare who replied.

**With Mesh**: Post "Tennis Saturday afternoon, intermediate, near Englischer Garten." Matching finds compatible people by skill level, location, and availability. Acceptance flow confirms the exact time from calendar overlap. One posting, no group-spamming.

**Negotiations resolved**: who (matching), when (scheduling intelligence), where (location matching). What and how many were specified in the posting.

### Quick Call — when coordination overhead exceeds the activity

**The problem**: I need a 15-minute call with a connection about a project idea. The typical exchange — "Can we talk? When? Now? In a meeting. After? Phone or video?" — takes 7 messages. The coordination is 3x longer than the activity.

**With Mesh**: User taps the connection and writes:

> Quick call about the API redesign? 15 min.

The system sees both calendars, computes that Kim is busy until 14:30, that the poster's current call might run until 14:40, and offers Kim a card: `[14:45] [15:00] [15:30]` with a note: "14:45 accounts for Alex's current call possibly running over." Kim taps one slot. Calendar event created. Done.

**Negotiations resolved**: when (calendar overlap), duration (inferred from "15 min"), format (call — no location needed). The acceptance card simplifies automatically when fewer decisions are needed.

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

### Friday dinner — group scheduling with trade-offs

**The problem**: Alex wants dinner with 3 friends Friday evening. The WhatsApp version: ~18 messages spread over hours. "When works?" "Where?" "Can we change to 20:00?" "Lena/Kai is that ok?" Everyone interrupted multiple times. The plan nearly fell apart twice.

**With Mesh**: Alex posts:

> Friday dinner at an Italian place, central Munich? Looking for 3 people. Casual, good conversation, maybe some wine. 19:00-ish.

The system checks calendars for 5 potential invitees. Marco is auto-skipped (busy). For the remaining 4, scheduling preferences are factored in: Priya's 40-minute commute from Garching, Lena's 1-hour post-work buffer, Kai's preference for non-alcoholic options (surfaced to Alex as a note). The system recommends 19:30.

**Personalized acceptance cards**: Priya's card notes "Your Garching meeting ends at 19:00. You'd arrive around 19:40" and offers `[Join (I'll be ~10 min late)]`. Kai's card is straightforward: "You're free at this time. [Join]". Each person's constraints are handled privately — Priya doesn't have to announce "I'm stuck in Garching" to the group.

**When there's no good overlap**: If Lena must leave by 21:00 and Priya can't arrive before 20:00, the all-4 window is only 1 hour — too short. The system surfaces the trade-off as a decision: "A. Without Priya: 19:00-21:00. B. Without Lena: 20:00-22:30. C. Saturday instead: all 4 free." Alex picks once. No multi-round group discussion.

**Negotiations resolved**: who (calendar pre-filtering), when (N-way overlap + preferences), where (`||hidden||` reveals exact restaurant on acceptance), logistics (`||hidden||` includes "I'll make a reservation" and contact number).

---

## Back-and-Forth Patterns

Every coordination conversation is made of a small set of recurring message patterns. This section catalogs each one and how Mesh compresses it.

### Pattern 1: Time Negotiation

**Typical exchange** (6-8 messages):
"When works for you?" / "Thursday evening?" / "I have yoga. Friday?" / "Morning or evening?" / "Evening, 19:00?" / "19:30 is better, I need to eat first" / "Ok 19:30"

**Why it exists**: Neither party knows the other's schedule. Social norms make it rude to just declare a time.

**Mesh compression (0 messages, 1 tap)**: Calendar overlap computes mutual availability. Scheduling preferences pick 2-3 smart slots. Invitee taps one.

### Pattern 2: Availability Check (Ask-Around)

**Typical exchange** (4-10+ messages, hours to days):
Ask one person — they're busy. Ask another — no reply. Ask a third — "what time?" Sequential asking, each with its own failure mode.

**Mesh compression (0 messages)**: Calendar auto-skip (busy contacts never notified). Sequential invite auto-advances on decline/timeout.

### Pattern 3: Location Exchange

**Typical exchange** (4-5 messages):
"That cafe near Goetheplatz" / "Which one?" / "Sedanstrasse 12" / "How do I get there?" / "Exit U-Bahn, walk south 2 min"

**Why it exists**: Posters give vague locations initially — it feels presumptuous to dump directions before someone has confirmed.

**Mesh compression (0 messages)**: Public text has the vague location. `||hidden||` has exact address + directions. Auto-revealed on acceptance.

### Pattern 4: Role/Responsibility Clarification

**Typical exchange** (6-8 messages):
"I'll bring the projector" / "Should I prepare slides?" / "Yes, and someone handle food?" / "I can. How many? Allergies?" / "6 people, Marco is lactose intolerant"

**Mesh compression (1 tap)**: `||?||` prompts ask on acceptance: "What can you contribute? [Slides] [Food] [Setup] [Other]". Details in `||hidden||`.

### Pattern 5: Preparation/Logistics

**Typical exchange** (5-6 messages):
"Should I bring anything?" / "Bring your racket" / "What about water?" / "Yeah, outdoor courts" / "Is there parking?" / "Lot on Sportstrasse"

**Mesh compression (0 messages)**: All prep info in `||hidden||`, revealed on acceptance.

### Pattern 6: Confirmation/Reminder

**Typical exchange** (2-3 messages, happens for nearly every event):
"Still on for tomorrow?" / "Yes! 19:30, usual place" / "See you then"

**Mesh compression (0 messages)**: Calendar event auto-created on acceptance. Posting visible in Active tab. Optional system reminder notification.

### Pattern 7: Renegotiation

**Typical exchange** (3-4 for 1-on-1, 6-12 for groups):
"Something came up, can we do 20:00?" / "Tight for me" / "19:30?" / "Works"

**Mesh compression (1 message + 1 tap)**: [Suggest different time] picks from remaining overlap. Poster taps [Accept change] or [Keep original]. Calendar auto-updated.

### Pattern 8: Introduction/Context (for strangers)

**Typical exchange** (6+ messages):
"Saw your post. What exactly are you working on?" / description / "What stack?" / answer / "Time commitment?" / answer

**Mesh compression (0 messages)**: Text-first posting is rich by default. Match explanation tells WHY they match. `||hidden||` reveals detailed plans on acceptance.

### Pattern 9: Follow-up/Recurrence

**Typical exchange** (4-8 messages):
"That was fun! Same time next week?" / "Maybe Tuesday instead?" / "Works. Same place?" / "I know a better spot..."

**Mesh compression (1 tap)**: Repost carries over text, location, `||hidden||`. System suggests new date. Previous participants notified.

### Pattern 10: Cancellation/Withdrawal

**Typical exchange** (3-4 for 1-on-1, 8+ for groups):
"Sorry, can't make it" / "Reschedule?" / "Maybe next week?" / "Let me check with the others..."

**Mesh compression (automatic)**: Withdrawal triggers waitlist auto-promotion or sequential invite continuation. Calendar auto-updated.

### Compression summary

| Pattern               | Typical messages | With Mesh | Key mechanism                                |
| --------------------- | ---------------- | --------- | -------------------------------------------- |
| Time negotiation      | 6-8              | 0 (1 tap) | Calendar + preferences + acceptance card     |
| Availability check    | 4-10+            | 0         | Calendar pre-filtering + sequential invite   |
| Location exchange     | 4-5              | 0         | `\|\|hidden\|\|`                             |
| Role clarification    | 6-8              | 1 tap     | `\|\|?\|\|` prompts + multi-role extraction  |
| Preparation/logistics | 5-6              | 0         | `\|\|hidden\|\|`                             |
| Confirmation/reminder | 2-3              | 0         | Calendar auto-creation + reminders           |
| Renegotiation         | 3-12             | 1+1 tap   | Suggest different time + calendar re-compute |
| Introduction/context  | 6+               | 0         | Text-first posting + match explanation       |
| Recurrence            | 4-8              | 1 tap     | Repost + participant notification            |
| Cancellation          | 3-8+             | 0 (auto)  | Waitlist + auto-promotion + calendar sync    |

**Average coordination: ~30-50 messages reduced to ~1-3 taps.**

The meta-pattern: every pattern above is a variation of **Proposal, Negotiation, Agreement**. Mesh compresses this to **Proposal, Acceptance** — the system front-loads information (calendar data, preferences, hidden details, context) so the first proposal is already good enough that negotiation is unnecessary.

---

## The Pattern Across Use Cases

Every use case involves the same set of negotiations — who, when, where, what, how many — that messaging apps force into back-and-forth. Mesh resolves them through matching, scheduling intelligence, and context inheritance.

The key difference between use cases isn't a type distinction — it's **which negotiations dominate** and **how many rounds** are needed:

| Use case             | Primary negotiation                 | Rounds                               | Nesting                          |
| -------------------- | ----------------------------------- | ------------------------------------ | -------------------------------- |
| Coffee now           | When (scheduling)                   | 1                                    | Flat                             |
| Spanish partner      | Who (deep compatibility)            | 1                                    | Flat                             |
| Short film crew      | Who + what (roles)                  | 1                                    | Flat                             |
| Copy-paste (k8s)     | Who (skill + reciprocity)           | 1                                    | Flat                             |
| Chess (minimal)      | Who (self-selection)                | 1                                    | Flat                             |
| Tennis with stranger | Who + when                          | 1                                    | Flat                             |
| Quick call           | When (scheduling)                   | 1                                    | Flat                             |
| Friday dinner        | When (N-way overlap)                | 1                                    | Flat (group)                     |
| Hackathon team       | Who + what (roles, vision)          | 1-2                                  | Channel -> group                 |
| Recurring practice   | When (per instance)                 | Ongoing, each round is 1 tap         | Parent -> weekly children        |
| Course project       | Who initially, then when repeatedly | Ongoing                              | Parent -> children over semester |
| Mentorship           | Who (deep compatibility)            | 1 for matching, ongoing for sessions | Channel -> pair -> sessions      |

Nesting reduces effort over time: the first posting requires describing everything, but subsequent coordination within the group is nearly frictionless because the context is already established.
