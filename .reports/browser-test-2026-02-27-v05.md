# Mesh UI Test Report - 2026-02-27 (v0.5 Deep Matching)

## Summary

- **Mode**: both (flows + visual spot checks)
- **Bugs Found**: 0
- **Flows Passed**: 11/11
- **Pages Scanned**: 8 (desktop + mobile)

## Bugs

No bugs found.

## Flow Tests

| #   | Flow               | Status | Notes                                                                                  |
| --- | ------------------ | ------ | -------------------------------------------------------------------------------------- |
| 1   | Authentication     | PASS   | Login form renders, OAuth buttons visible, sign-in redirects to /active                |
| 2   | Sidebar Navigation | PASS   | All 6 nav items work (Discover, My Postings, Active, Connections, Profile, Settings)   |
| 3   | Create Posting     | PASS   | Text-first approach with AI extract textarea, form tab with fields                     |
| 4   | Browse/Discover    | PASS   | Category filtering works, search accepts input, empty state correct                    |
| 5   | Posting Detail     | PASS   | Title, match %, breakdown section, creator sidebar, action buttons                     |
| 6   | My Postings        | PASS   | Page loads with heading, search/filter controls, posting cards                         |
| 7   | Active             | PASS   | Tabs (All/Created/Joined) work, content updates on tab switch                          |
| 8   | Connections        | PASS   | Split-pane layout, search bar, connection request visible, + Add button                |
| 9   | Profile            | PASS   | Heading with email, GitHub enrichment card, Quick Update, General Info                 |
| 10  | Settings           | PASS   | Account section, Connected Accounts (Google/GitHub/LinkedIn), Notification Preferences |
| 11  | Sign Out           | PASS   | Dropdown with Profile/Settings/Sign out, redirects to /login, route protection works   |

## Visual Spot Checks (Mobile 375x812)

| Page        | Route          | Desktop | Mobile | Notes                                         |
| ----------- | -------------- | ------- | ------ | --------------------------------------------- |
| Discover    | /discover      | OK      | OK     | Category chips wrap, cards stack, no overflow |
| Connections | /connections   | OK      | OK     | Single-column layout, sidebar collapses       |
| Profile     | /profile       | OK      | OK     | Cards stack vertically, text reflows properly |
| Settings    | /settings      | OK      | OK     | Sections stack, connected accounts fit        |
| Active      | /active        | OK      | N/A    | Desktop verified in flow tests                |
| My Postings | /my-postings   | OK      | N/A    | Desktop verified in flow tests                |
| Post Detail | /postings/[id] | OK      | N/A    | Desktop verified in flow tests                |
| Login       | /login         | OK      | N/A    | Desktop verified in flow tests                |

## Notes

- v0.5 changes are backend-only (deep match LLM, skill hard filter, tier scaffolding, explanation API) — no new UI surfaces introduced
- All existing UI flows remain fully functional after the v0.5 merge
- MCP extension disconnected once during Settings scroll; reconnected successfully
- No horizontal scroll, overflow, or broken layout issues found at either viewport

## Test Environment

- Branch: `dev` (post-merge of feat/v05-deep-match-llm, feat/v05-hard-skill-filter, feat/v05-explanations-tier-distance)
- Dev server: `http://localhost:3000`
- Browser: Chrome (desktop, mobile viewport simulation)
- User: ajb60722@gmail.com (Test User)
- QA status: 1005 tests passing, 0 type errors, 0 lint errors
