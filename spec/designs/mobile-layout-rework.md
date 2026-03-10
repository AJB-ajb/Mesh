# Mobile Layout Rework — Design

## Context

Audit on 2026-03-07 identified layout inconsistencies and mobile UX issues across the posting creation, editing, and management flows. Discussion resolved the design questions. This document captures the current state, the problems, the resolved design decisions, and the implementation plan.

## Current State

### Three surfaces for posting owner controls:

| Surface        | Route                       | Invite UI                                                                                                                              | Settings UI                                                    | Layout                                                                                              |
| -------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Create**     | `/postings/new`             | PostingContextBar: compact rows ("Invite / + Add people", "Link / Create link", "Show in Discover" toggle)                             | Expandable "Settings" row (size, expire, accept, N-sequential) | Single column, mobile-first                                                                         |
| **Edit tab**   | `/postings/[id]?tab=edit`   | Same PostingContextBar (identical component)                                                                                           | Same expandable Settings row                                   | 3-col grid on desktop, stacks on mobile. FreeFormUpdate + ContextBar + Sidebar                      |
| **Manage tab** | `/postings/[id]?tab=manage` | SequentialInviteCard: full card with Sequential/Parallel toggle, Advanced settings, drag-to-reorder connection list, progress timeline | None (settings only on Edit)                                   | 3-col grid on desktop, stacks on mobile. JoinRequests + InviteCard + MatchedCollaborators + Sidebar |

## Problems

### P1: Two different invite UIs, unclear relationship

- **Context Bar** (create/edit): Simple "+ Add people" adds names to a pill list. No mode selection (sequential/parallel). No progress tracking.
- **SequentialInviteCard** (manage): Full-featured card with mode selection, ordering, progress timeline.
- A user who invites people during creation doesn't know those invites are separate from the Manage tab's invite system.

### P2: Edit + Manage tab split doesn't match real usage

Post-creation work falls into 3 buckets:

1. **Monitor** (passive, most common) — invite progress, who accepted/declined/pending
2. **React** (lightweight) — approve/reject join requests
3. **Adjust** (rare) — edit description, add hidden details, reorder invites, change settings

The current tabs get this backwards:

- **Edit tab** is prominent but rarely needed (text-first means content is usually done at creation)
- **Manage tab** is heavy (3 cards, config UI) but the main need is just a progress view
- The most common activity (monitoring) has no clean, compact surface

### P3: Title truncation on posting detail

- Owner view: title in a fixed-height `h-10` input — clips long titles
- Non-owner view: `text-3xl` h1 with no wrapping control

### P4: Posting card title/description duplication

- When title is extracted from description (first line), both title and description render the same text on every card

### P5: Quick fixes

- Posts page filter chips: `scrollbar-none` (undefined) should be `scrollbar-hide`
- FAB shows on Settings and Connections pages where it's irrelevant
- Contact Creator button is overly large; should be a small message icon

## Design Decisions (Resolved)

### D1: Unified invite component — single picker everywhere

One compact invite component used on Create, Edit, and the owner posting view. Tapping "+ Add people" opens a bottom-sheet picker with:

1. Connection search/list (tap to add)
2. Selected connections with drag-to-reorder
3. Mode toggle (Sequential/Parallel) — defaults to parallel, can expand
4. "Suggested people" section at the bottom (replaces Matched Collaborators card)

This replaces both the simple `InlineInvitePicker` (create/edit) and the heavyweight `SequentialInviteCard` (manage). Same mental model everywhere.

### D2: Collapse Edit + Manage into a single owner view

No more separate Edit and Manage tabs. The owner's posting detail is one scrollable view, ordered by what they actually need post-creation:

1. **Invite progress** (top) — compact, messenger-like. Shows each invitee with status (pending/accepted/declined/skipped). Inline reorder and cancel. "Invite more" button opens the unified picker (D1).
2. **Join requests** — shown inline if any exist. Approve/reject with one tap.
3. **Edit** — accessible via button or expandable section, not a separate tab. Description editor, settings, link, discover toggle. Not shown by default because text-first means content is usually done at creation.

This maps to the real usage pattern: monitor first, react to requests, occasionally adjust.

### D3: Matched Collaborators becomes "Suggested people to invite"

Matched Collaborators is discovery, not management. It moves into the invite picker (D1) as a "Suggested" section — shown when the user taps "+ Add people" and is looking for who to invite. No longer a standalone card on the Manage tab.

### D4: Hide PostingSidebar for owners on mobile

The sidebar shows "Posting Creator: [your name]" — useless when you ARE the creator. Hide for owners on mobile. Keep on desktop (sidebar column doesn't cost scroll depth). Non-owners still see it.

### D5: Contact Creator — small message icon

Replace the full-width "Contact Creator" button in the sidebar with a small message icon button next to the creator's name/badge. Everyone recognizes the icon, saves space on mobile.

### D6: Title wrapping

Allow title to wrap up to 2 lines with `line-clamp-2` on both owner input (auto-resizing textarea) and non-owner h1. Truncate with ellipsis beyond that.

### D7: Messenger-like feel

The overall direction is messenger-like: compact, status-driven, action items surface naturally. Not a dashboard with separate tabs for configuration.

## Use Case Validation

Post-creation walkthrough for key use cases:

### Coffee Now (sequential, 1 spot)

| After creation | Owner needs            | New design                                         |
| -------------- | ---------------------- | -------------------------------------------------- |
| Lena invited   | See status             | Invite progress: "Lena — pending"                  |
| Lena declines  | Nothing (auto-advance) | Progress updates: "Lena declined. Marco — pending" |
| Marco accepts  | Confirmation           | "Marco accepted" — done                            |

Owner visits posting once or twice. Sees progress. No tab switching. No config.

### Friday Dinner (sequential, 3 friends)

| After creation             | Owner needs               | New design                             |
| -------------------------- | ------------------------- | -------------------------------------- |
| Monitor 5 invites          | See who accepted/declined | Invite progress list                   |
| 2 accepted, add restaurant | Edit description          | Tap edit, add `\|\|hidden\|\|` details |
| Reorder remaining invites  | Adjust invite order       | Inline reorder on progress view        |

### Spanish Partner (dual-track)

| After creation                | Owner needs        | New design                                |
| ----------------------------- | ------------------ | ----------------------------------------- |
| Sequential invites running    | Monitor            | Invite progress                           |
| Carlos applies from Discover  | Review and approve | Join request inline, approve with one tap |
| Ana declines, Carlos promoted | See auto-promotion | Progress updates                          |

### Short Film Crew (parallel, multi-role)

| After creation               | Owner needs         | New design                                        |
| ---------------------------- | ------------------- | ------------------------------------------------- |
| 3 roles, invites in parallel | See per-role status | Invite progress grouped by role                   |
| Julia gets actor slot        | See confirmation    | "Actor: Julia accepted"                           |
| Invite more for sound        | Add people          | "Invite more" opens picker with suggested matches |

## Implementation Plan

### Phase 1: Quick fixes (no design changes)

- P3: Title wrapping — `line-clamp-2` on h1, auto-resize textarea for owner input
- P4: Card title/description dedup — strip first line from description when it matches extracted title
- P5: `scrollbar-none` to `scrollbar-hide`, FAB hide on settings/connections
- D5: Contact Creator button to small message icon

### Phase 2: Unified owner view

- Collapse Edit + Manage tabs into single owner view
- Build invite progress component (compact, inline status per invitee)
- Move description editing behind expandable section
- Hide PostingSidebar for owners on mobile (D4)

### Phase 3: Unified invite picker

- Build bottom-sheet invite picker component
- Integrate "Suggested people" (from Matched Collaborators) into picker
- Replace InlineInvitePicker and SequentialInviteCard with unified component
- Use on Create, Edit, and owner posting view

## Key Code Locations

| Component                | File                                                    | Purpose                                             |
| ------------------------ | ------------------------------------------------------- | --------------------------------------------------- |
| PostingContextBar        | `src/components/posting/posting-context-bar.tsx`        | Invite/link/discover/settings rows on Create + Edit |
| SequentialInviteCard     | `src/components/posting/sequential-invite-card.tsx`     | Full invite UI on Manage tab                        |
| SequentialInviteSelector | `src/components/posting/sequential-invite-selector.tsx` | Connection picker with drag-to-reorder              |
| SequentialInviteStatus   | `src/components/posting/sequential-invite-status.tsx`   | Progress timeline for invites                       |
| PostingManageTab         | `src/components/posting/posting-manage-tab.tsx`         | Manage tab layout (3-col grid)                      |
| PostingEditTab           | `src/components/posting/posting-edit-tab.tsx`           | Edit tab layout                                     |
| UnifiedPostingCard       | `src/components/posting/unified-posting-card.tsx`       | Card with title/desc duplication                    |
| PostingDetailHeader      | `src/components/posting/posting-detail-header.tsx`      | Title truncation                                    |
| PostingSidebar           | `src/components/posting/posting-sidebar.tsx`            | Creator card + contact button                       |
| Posts page               | `src/app/(dashboard)/posts/page.tsx`                    | `scrollbar-none` bug                                |
| CreatePostingFab         | `src/components/layout/create-posting-fab.tsx`          | FAB hide conditions                                 |
