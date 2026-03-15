# Spec Directory — Index & Loading Guide

## Layers

| Layer | Name         | Purpose                                               | Change frequency                                                                    |
| ----- | ------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **0** | Direction    | Why we exist, for whom, guiding scenarios             | Rarely                                                                              |
| **1** | Behavior     | How the product should work — target state + insights | When product design changes                                                         |
| **2** | Roadmap      | What's done, what's next — milestones & checkboxes    | When milestones ship                                                                |
| **3** | Architecture | How it's built — tech stack, libraries, deployment    | When stack changes                                                                  |
| —     | `designs/`   | Ephemeral per-milestone feature designs               | Created during planning, folded into Layer 1 when shipped, then archived or deleted |

Layer 0: read when unsure about product direction.
Layer 1: each file has a `## Current Deviations` section at the bottom listing gaps vs. current implementation (linked to roadmap milestones). Update BEFORE code changes.
Layer 2: the ONLY place with version numbers and implementation checkboxes. Update when milestones ship.
Layer 3: concise reference for agents.

## File Index

| File                  | Layer | Description                                                          |
| --------------------- | ----- | -------------------------------------------------------------------- |
| `0-vision.md`         | 0     | Philosophy, core insights, target audiences                          |
| `0-use-cases.md`      | 0     | Canonical scenarios — flat, nested, and case studies                 |
| `1-mesh.md`           | 1     | Product overview hub — scope, approach, monetization                 |
| `1-ux.md`             | 1     | UX principles, layout, voice & tone, mobile-first                    |
| `1-text-first.md`     | 1     | Text-first philosophy, data model, `mesh:` syntax                    |
| `1-matching.md`       | 1     | Matching dimensions, scoring, deep match                             |
| `1-scheduling.md`     | 1     | Scheduling intelligence (3 layers)                                   |
| `1-skills.md`         | 1     | Skill tree, taxonomy, LLM maintenance                                |
| `1-availability.md`   | 1     | Calendar sync, availability windows, overlap                         |
| `1-spaces.md`         | 1     | Spaces model, conversation, posting-messages, sub-Spaces, membership |
| `1-posting-access.md` | 1     | Composable access model (discover/invite/link/context)               |
| `1-terminology.md`    | 1     | Canonical terms with reasoning                                       |
| `1-testing.md`        | 1     | Testing philosophy and guidelines                                    |
| `2-roadmap.md`        | 2     | Milestones, status, versioning                                       |
| `3-architecture.md`   | 3     | Tech stack, key libraries, deployment                                |
| `designs/`            | —     | Active per-milestone design documents                                |

## Loading Guidance

Read the minimum set of files for your task:

| Task                           | Files to load                                                              |
| ------------------------------ | -------------------------------------------------------------------------- |
| Bug fix in matching            | `1-matching.md`                                                            |
| UX change                      | `1-ux.md` + `0-use-cases.md`                                               |
| New feature                    | `0-vision.md` + relevant `1-*` files (esp. `1-spaces.md`) + `2-roadmap.md` |
| Space model question           | `1-spaces.md`                                                              |
| Architecture question          | `3-architecture.md`                                                        |
| Unsure about product direction | `0-vision.md` + `0-use-cases.md`                                           |
| Need canonical term            | `1-terminology.md`                                                         |
| Tech stack check               | `3-architecture.md`                                                        |
| Card suggestions / prefill     | `designs/intelligent-prefill.md` + `1-spaces.md` §7 + `0-use-cases.md`     |
| Scheduling intelligence        | `1-scheduling.md` + `designs/intelligent-prefill.md`                       |

## Spec Update Rules

1. Layer 1 specs describe **target state** ("what is right"), not current state.
2. New features require a Layer 1 spec update BEFORE code changes.
3. Bug fixes usually don't require spec changes (unless the spec was wrong).
4. Implementation status belongs ONLY in Layer 2 (roadmap).
5. Cross-reference between specs — never duplicate content.

## Content Shapes

Specs follow one of three shapes:

- **Shape A — Insight-driven**: vision, text-first, spaces, posting-access, matching, skills. Lead with "why", then "how".
- **Shape B — Reference**: terminology, availability. Structured lookup tables.
- **Shape C — Direction**: vision, use-cases. Narrative, no deviations section.
