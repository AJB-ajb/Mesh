# Continuous Profile Building & Failure-Driven Context Capture

> **Status**: Exploration — not yet designed or scheduled. Captured from product discussion 2026-03-10.

## Problem

Profile quality drives matching quality, but users won't fill out rich profiles upfront. The spec's "30-second onboarding" and "no personal configuration required to post" goals conflict directly with the need for context. Meanwhile, coordination failures (bad matches, cancelled invites, exhausted invite sequences) are dead ends instead of learning opportunities.

## Key Ideas

### 1. Posting-driven profile enrichment

Every posting reveals information about the user. The system could suggest profile additions after posting:

- Post mentions "Spanish, B2, Munich" → prompt to add Spanish (B2) and Munich to profile
- Three postings on weekday evenings → suggest setting evening availability as default
- Repeated "pair programming" mentions → suggest adding as collaboration preference

Profile becomes a **residue of activity**, not a form.

### 2. Progressive onboarding tiers

| Tier | Context level            | What the system knows                                     | How                                                    |
| ---- | ------------------------ | --------------------------------------------------------- | ------------------------------------------------------ |
| 0    | First visit              | Nothing                                                   | User posts; matching is shallow (location + embedding) |
| 1    | After first posting      | Skills, location, time preferences extracted from posting | Post-posting nudge: "Add these to your profile?"       |
| 2    | After first coordination | Activity history, who they worked with, feedback          | Post-activity prompt: "How was the match?"             |
| 3    | Active user              | Rich composite of postings, acceptances, feedback         | Occasional freshness nudge: "Still accurate?"          |

### 3. Failure-driven constraint suggestions

When coordination fails, use the failure to prompt for more context:

- **No matches found** → diagnose why (too specific? too vague? candidate profiles missing data?) and suggest actionable relaxations or additions
- **Sequential invite exhausted** → offer to open to Discover, lower constraints, or post to a related channel
- **Last-minute cancellation** → auto-generate context brief for waitlist-promoted person; suggest constraint widening if no waitlist
- **Match accepted but coordination fails** → prompt for scheduling preference ("Add a buffer after work?") or mark no-show

### 4. Acceptance/rejection-driven learning

- Consistent rejection of low-skill matches → surface as preference suggestion
- Rejection streak → prompt: "Is there something specific you're looking for?"
- Post-activity feedback ("not what I expected") → captures implicit criteria the posting didn't express

## Open Questions

- How pushy should nudges be? Risk of notification fatigue vs. value of captured context.
- Should profile suggestions be one-tap (add skill X) or freeform (tell us more)?
- How does this interact with the existing post-write nudge system (currently deferred in backlog)?
- Privacy implications of inferring preferences from behavior patterns.
- Should the system silently adjust matching weights based on behavior, or always surface changes explicitly?

## Dependencies

- Text-first profile (v0.6) — the profile needs to be editable text for incremental additions to work naturally
- Smart acceptance cards (v0.8) — failure recovery flows interact with the acceptance UX

## Decision

Deferred until main flow (v0.6–v0.8) is solid. Revisit after v0.8 ships.
