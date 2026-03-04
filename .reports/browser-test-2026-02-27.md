# Mesh UI Test Report - 2026-02-27

## Summary

- **Mode**: v0.4 Feature Verification (Smart Input & Profile)
- **Bugs Found**: 0 critical, 0 high, 0 medium, 1 low
- **Features Tested**: 7/7

## v0.4 Feature Verification Results

| #   | Feature                  | Status | Notes                                                                                                                                                                                                                                                                                                                                                 |
| --- | ------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Suggestion chips         | PASS   | Chips appear below textarea, update based on text content (time/location/team/level dimensions). Clicking a chip appends text to textarea. Dismiss button (X) works. Horizontal scroll present.                                                                                                                                                       |
| 2   | Slash command menu       | PASS   | Typing `/ti` triggers filtered popup showing `/time` and `/template`. Menu renders at cursor position with icon + name + description for each command.                                                                                                                                                                                                |
| 3   | Time picker overlay      | PASS   | Selecting `/time` opens overlay with day chips (Weekdays/Weekends, Mon-Sun), time-of-day chips (Morning/Afternoon/Evening), custom time range inputs, and Cancel/Insert buttons. Selecting Weekdays + Evening and clicking Insert correctly appends "weekdays evening (5-10pm)" to textarea.                                                          |
| 4   | Post-write nudges        | PASS   | After typing 20+ chars and waiting ~3s, nudge banners appear (amber/warning style). Saw "You haven't mentioned when" and "No location mentioned" nudges with clickable suggestion links. Clicking suggestion link inserts text into textarea. Nudges correctly detect missing dimensions based on text content.                                       |
| 5   | Auto-format (text tools) | PASS   | Clicking Auto-format shows "Formatting..." loading state with spinner. After LLM response, diff preview modal opens with side-by-side Original/Proposed view. Word-level diff highlighting works (red strikethrough for removals, green for additions). LLM correctly added ## headings, **bold**, and `code` formatting. Cancel/Accept buttons work. |
| 6   | Edit details manually    | PASS   | Collapsible section with chevron icon. Clicking expands to show PostingFormCard with "Posting Details" form. Chevron rotates on toggle.                                                                                                                                                                                                               |
| 7   | Profile page             | PASS   | Profile page loads with Quick Update card, General Information, and Availability sections. No extraction review card shown (expected — user didn't come from onboarding).                                                                                                                                                                             |

## Features Not Fully Testable in Desktop Browser

| Feature                             | Reason                                                                                                                                                                                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mobile markdown toolbar             | Requires actual mobile keyboard detection via `visualViewport` API. Toolbar has `md:hidden` CSS class. Cannot simulate real keyboard events from desktop Chrome.                                                                                                     |
| Skill gap prompt                    | Requires a posting with specific skills that the current user's profile lacks. The test posting ("FastAPI Python Project") had "No specific skills listed" in the structured skills field, so no gap was detected. Component is correctly hidden when no gap exists. |
| Profile onboarding (guided prompts) | Would require a new user account with no profile data. Test user already has a profile, so guided prompts are bypassed.                                                                                                                                              |
| Profile extraction review           | Would require submitting a profile with `?extraction=pending` query param from onboarding flow. Cannot test without creating data (read-only constraint).                                                                                                            |

## Observations

1. **Suggestion chips are context-aware**: When text contained skills (TypeScript, Tailwind) but no time/location, chips correctly showed time and location suggestions. After inserting time via slash command, time chips disappeared and only location/team-size chips remained.

2. **Nudge banners stack correctly**: Two nudges appeared simultaneously (time + location), each dismissible independently. Max 2 shown as designed.

3. **Slash command → overlay → insert flow is seamless**: The full flow from typing `/ti` → selecting `/time` → picking day/time → Insert works without any glitches. The `/ti` prefix correctly filtered to show only `/time` and `/template`.

4. **Auto-format diff quality**: The LLM produced reasonable formatting — added section headings, bold for key terms, backticks for technical terms. The word-level diff highlighting clearly shows what changed.

5. **All v0.4 UI elements compose well on the posting creation page**: Suggestion chips, text tools, nudge banners, slash command menu, and the collapsible form section all render in their designated areas without overlap or layout issues.

## Low-Severity Issues

### BUG-001: First chip text truncated on narrow viewports

- **Severity**: low
- **Category**: style
- **Page**: /postings/new
- **Viewport**: desktop (when chips bar has many items)
- **Description**: The first chip in the horizontal scroll bar sometimes shows truncated text (e.g., "kday evenings" instead of "weekday evenings") when the scroll position is not at the start.
- **Expected**: Chip text should be fully visible or the scroll should start at the beginning.
- **Actual**: First chip partially hidden by left edge of scroll container.

## Test Environment

- Branch: `feat/v04-smart-input-profile` (integration worktree)
- Dev server: `http://localhost:3000`
- Browser: Chrome (desktop)
- User: ajb60722@gmail.com (Test User)
- QA status: 982 tests passing, 0 type errors, 0 lint errors
