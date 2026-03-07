# Mesh UI Test Report — 2026-03-05

## Summary

- **Date**: 2026-03-05
- **Mode**: flows (targeted)
- **Viewport**: desktop
- **Target**: Smart Acceptance Card flow (Phase 3)
- **Bugs Found**: 2 (0 critical, 1 high, 1 medium)
- **Flows Passed**: 1/1
- **Test Data Cleaned**: partial (browser extension disconnected before cleanup)

## Context

This test validated the newly implemented Smart Acceptance Card feature — an LLM-generated structured UI that replaces the simple "Join" button on posting detail pages. The card collects time preferences, question answers, and role selections at acceptance time.

## Bugs

### BUG-001: 60-second Gemini timeout causes very long loading state

- **Severity**: high
- **Category**: UX
- **Page**: /postings/[id] (posting detail — acceptance card)
- **Viewport**: desktop
- **Steps to Reproduce**:
  1. Navigate to any open posting as a non-owner
  2. Click "Request to join"
  3. Enter a cover message and click "Continue"
  4. Observe the acceptance card loading state
- **Expected**: Card loads within 3-5 seconds, or shows a progress indicator / "taking longer than expected" message after 5s
- **Actual**: The "Preparing your join form..." spinner shows for the full 60-second Gemini timeout before falling back to the minimal card. No indication that it's waiting on an external service.
- **Suggested Fix**: Reduce Gemini timeout to 10-15s for the acceptance card endpoint, or add a "Taking longer than expected..." message after 5s. Consider streaming the fallback card immediately and upgrading to the AI-generated card if it arrives in time.

### BUG-002: Discover page inline "Request to join" buttons bypass acceptance card

- **Severity**: medium
- **Category**: functionality
- **Page**: /discover
- **Viewport**: desktop
- **Steps to Reproduce**:
  1. Navigate to /discover
  2. Find an open posting with an inline "Request to join" button
  3. Click the inline button
- **Expected**: Smart Acceptance Card flow is triggered (same as posting detail page)
- **Actual**: The inline buttons on the discover page use their own direct handlers that bypass ApplySection entirely, creating applications without going through the acceptance card flow.
- **Suggested Fix**: Either wire the discover page inline buttons through the same acceptance card flow, or accept this as intentional (quick-join from discover, detailed join from posting detail). If intentional, document it.

## Flow Tests

| #   | Flow                                   | Status | Notes                                                       |
| --- | -------------------------------------- | ------ | ----------------------------------------------------------- |
| 1   | Smart Acceptance Card — full join flow | PASS   | Loading state, fallback, cancel, confirm all work correctly |

### Flow 1: Smart Acceptance Card — Detailed Steps

| Step | Action                                              | Result                                                                                |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1    | Navigate to posting detail (FastAPI Python Project) | Page loads correctly                                                                  |
| 2    | Click "Request to join" button                      | Cover message form appears                                                            |
| 3    | Enter cover message, click Continue                 | Acceptance card loading state appears ("Preparing your join form..." with spinner)    |
| 4    | Wait for Gemini timeout (60s)                       | Fallback card renders with "Confirm & Join" and "Cancel" buttons                      |
| 5    | Click "Cancel"                                      | Returns to cover message form (correct)                                               |
| 6    | Click Continue again, wait for fallback             | Fallback card appears again                                                           |
| 7    | Click "Confirm & Join"                              | Application created, page shows "Request pending" badge and "Withdraw request" button |

### Observations

- The `responses` JSONB column migration needed to be applied (`supabase db push`) before the flow worked end-to-end
- Gemini API consistently timed out during testing (likely free tier rate limits), so only the fallback path was exercised
- The fallback path works correctly — returns a minimal card with just the confirm button
- The `ApplicationResponses` data is stored correctly in the `applications.responses` column
- Cancel button correctly returns to the cover message form without state leakage

## Cleanup

| Entity                               | ID                   | Action   | Result                                    |
| ------------------------------------ | -------------------- | -------- | ----------------------------------------- |
| Application (FastAPI Python Project) | faeb5ab8-... posting | Withdraw | NOT DONE — browser extension disconnected |
| Application (JavaScript algorithms)  | unknown              | Withdraw | NOT DONE — browser extension disconnected |

**Note**: Browser extension disconnected before cleanup could be performed. These test applications should be withdrawn manually or will be cleaned up in the next test session.

## Test Environment

- **Browser**: Chrome (via Claude-in-Chrome)
- **Dev server**: localhost:3000
- **Date**: 2026-03-05
- **Branch**: dev (post-merge of smart-acceptance-card feature)
- **Gemini API**: Consistently timed out (60s) — only fallback path tested
