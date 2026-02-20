# MeshIt UI Test Report - 2026-02-18

## Summary

- **Mode**: both
- **Bugs Found**: 5 (0 critical, 3 high, 2 medium, 0 low)
- **Flows Passed**: 9/11 (2 failed, 0 skipped)
- **Pages Scanned**: 12 (4 public, 8 protected)
- **Screenshots**: /tmp/meshit-screenshots/

---

## Bugs

### BUG-001: User dropdown is hover-only — not keyboard or click accessible

- **Severity**: high
- **Category**: accessibility
- **Page**: /dashboard (and all AppShell pages)
- **Viewport**: both
- **Description**: The user dropdown in the header (avatar button -> Profile / Settings / Sign out) is implemented using CSS `group-hover` only. Clicking the avatar button does not open the dropdown; hovering over it does. This means keyboard users and touch users (mobile) cannot access the menu at all. In `header.tsx` the wrapping div uses `group-hover:opacity-100 group-hover:visible` with no click/state handler on the button.
- **Expected**: Clicking the avatar button should toggle the dropdown open/closed (e.g. using React state, Radix `DropdownMenu`, or equivalent). The menu should also be keyboard-accessible via Enter/Space/Escape.
- **Actual**: The dropdown is only reachable by CSS `:hover`. Clicking the button does nothing. On touch/mobile devices and in automated testing the dropdown is completely inaccessible.

---

### BUG-002: Sign Out unreachable on mobile due to hover-only dropdown

- **Severity**: high
- **Category**: UX
- **Page**: AppShell header (all protected routes)
- **Viewport**: mobile
- **Description**: Because the user dropdown is hover-only (BUG-001), mobile/touch users have no way to sign out from the header. The Settings page does expose a "Sign out" button in the main content area (confirmed working), but there is no affordance pointing users there. The header avatar gives no indication that it opens a menu or where sign-out lives.
- **Expected**: Sign Out should be reachable from the header on touch/mobile devices, or a visible "Sign out" link should be surfaced prominently elsewhere in the mobile navigation.
- **Actual**: Header dropdown unreachable on mobile. Sign-out only discoverable by visiting /settings.

---

### BUG-003: Multiple pages show a persistent blank spinner on initial load (no skeleton UI)

- **Severity**: high
- **Category**: UX
- **Page**: /postings, /matches, /bookmarks, /inbox, /settings, /profile
- **Viewport**: both
- **Description**: On initial page navigation (cold load, no SWR cache), the main content area of these pages renders only a blank dark background with a small centered spinner. No skeleton placeholders are shown. The spinner state persists for 1-3 seconds before content appears. Confirmed in screenshots: /postings, /matches, /bookmarks, /settings, and /profile all captured mid-spinner. The chrome (sidebar, header) renders immediately but the content area is fully blank during the fetch.
- **Expected**: Skeleton card/list placeholders should fill the content area immediately, giving users a visual indication of the incoming layout and preventing the "blank page" impression.
- **Actual**: Black content area with a single centered spinner for 1-3 seconds on every cold page visit.

---

### BUG-004: Posting card body is not a link — only the "View Details" button navigates to the detail page

- **Severity**: medium
- **Category**: UX
- **Page**: /postings
- **Viewport**: both
- **Description**: Posting cards on the Discover tab show "Request to join" and "View Details" action buttons, but the card body (title, description, tags) is not wrapped in an anchor element. Users must click the small "View Details" button to navigate to the detail page. The card title is not clickable. This deviates from standard card UX where the card or title links to the detail view, and it is not keyboard-navigable to the detail page without reaching the button.
- **Expected**: The posting title (or the entire card) should be an `<a href="/postings/[id]">` link. Standard practice for card-based UIs.
- **Actual**: Only the "View Details" button triggers navigation to the detail page. Card body and title are inert.

---

### BUG-005: /postings content area has no skeleton — blank area below filters during load

- **Severity**: medium
- **Category**: UX
- **Page**: /postings
- **Viewport**: both
- **Description**: The Postings page renders the Discover/My Postings tabs, search bar, voice input icon, filter button, and category chips immediately. Below those controls, the card grid area is completely blank with only a small centered spinner during the data fetch. There is no card skeleton layout matching the eventual card structure.
- **Expected**: A grid of skeleton card placeholders should appear while data is loading, preserving the layout structure and providing a polished loading experience.
- **Actual**: Blank black area below the chip filters. A spinner appears in the center of the empty space.

---

## Flow Tests

| #   | Flow                 | Status | Notes                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --- | -------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Authentication       | PASS   | Login form renders correctly: email input, password input, "Sign in" submit button, "Forgot password?" link, "Sign up" link, 3 OAuth buttons (Google/GitHub/LinkedIn icons). Login with test credentials succeeded and redirected to /dashboard.                                                                                                                                                                               |
| 2   | Dashboard Navigation | PASS   | All 7 sidebar nav items confirmed present (Dashboard, Postings, Matches, Bookmarks, Inbox, Profile, Settings) plus New Posting CTA. Header search input, notification bell, and avatar all present. All 6 routes (/postings, /matches, /bookmarks, /inbox, /profile, /settings) navigated to successfully and loaded correctly.                                                                                                |
| 3   | Create Posting       | PASS   | Page loads at /postings/new. Two modes available via tab switcher: "Fill Form" and "AI Extract". Page defaults to AI Extract with a large textarea (placeholder: "Paste your posting text here, or use the mic to describe it..."), an example posting pre-filled, "Extract Posting Details" button, and "Switch to Form" button. AI is the primary UX flow.                                                                   |
| 4   | Browse Postings      | PASS   | Discover/My Postings tabs present. Category chips (All, Study, Hackathon, Personal, Professional, Social) visible. Search bar with voice input and filter icons present. Posting cards load after a brief spinner with full content (title, description, tags, applicant count, duration, timezone, match percentage badge, "Request to join"/"View Details" buttons).                                                         |
| 5   | Posting Detail       | FAIL   | Test script could not find card-level anchor links (none exist — BUG-004). The script incorrectly matched /postings/new as a posting link. Navigating to a detail page directly via "View Details" button click works correctly (confirmed from bookmarks page, which has "View Details" buttons that go to /postings/[id]). Scored FAIL because the flow script requirement "click on a posting card" could not be satisfied. |
| 6   | Matches              | PASS   | Page loads and shows a well-designed "Profile Incomplete" empty state: search icon, "Profile Incomplete" heading, descriptive text "Add a description and skills to your profile so we can find relevant matches for you.", and a "Go to Profile" CTA button. Layout is clean on desktop and mobile.                                                                                                                           |
| 7   | Bookmarks            | PASS   | Page loads with 3 bookmarked posting cards visible (Edgar Allan Poe Short Story Theater Project, Next.js SaaS Boilerplate, AI Data Analysis Dashboard). Each card shows title, category badge, status badge ("Pending"), description snippet, skill tags, posted-by avatar+name+timestamp, and "View Details" button.                                                                                                          |
| 8   | Inbox                | PASS   | Page renders with "Notifications" and "Messages" tabs (underline tab style, bell and chat icons). Notifications tab is active by default and shows "No notifications yet" empty state with icon. Messages tab is present.                                                                                                                                                                                                      |
| 9   | Profile              | PASS   | Profile page shows redesigned AI-first layout: "Your Profile" heading, email displayed, "Edit Profile" button, GitHub Profile Enrichment card (amber warning state prompting GitHub connection), and "Quick Update" AI panel with pre-populated profile description textarea and voice input, plus "Apply Update" button. GitHub section is present as required.                                                               |
| 10  | Settings             | PASS   | Settings page renders "Account" section (email shown: ajb60721@gmail.com, account type: Member) and "Connected Accounts" section listing Google (Connected, Disconnect button), GitHub (Not connected, Connect button), LinkedIn (Not connected, Connect button). All required elements confirmed.                                                                                                                             |
| 11  | Sign Out             | FAIL   | The header user dropdown is CSS hover-only (BUG-001). Clicking the avatar button does not open the dropdown; the "Sign out" option is unreachable via click. Sign-out via /settings page main content area works correctly and redirects to /login. Route protection after sign-out is working: /dashboard correctly redirects to /login once the session is cleared.                                                          |

---

## Pages Tested

| Page            | Route            | Desktop | Mobile | Notes                                                                                                                                                                                                                                            |
| --------------- | ---------------- | ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Landing         | /                | PASS    | PASS   | Logged-in users redirect to /dashboard (correct behavior). Dashboard renders with full AppShell: sidebar, header, 4 stats cards, Quick Actions panel, Recommended postings empty state with helpful guidance message.                            |
| Login           | /login           | PASS    | PASS   | Email input, password input, "Forgot password?" link, "Sign in" button, 3 OAuth icon buttons, "Sign up" link all present. Both viewports render cleanly. Mobile shows proper single-column layout.                                               |
| Sign Up         | /signup          | PASS    | PASS   | Registration form renders correctly on desktop and mobile.                                                                                                                                                                                       |
| Forgot Password | /forgot-password | PASS    | PASS   | Email input and "Send reset link" button present. Clean layout on both viewports.                                                                                                                                                                |
| Dashboard       | /dashboard       | PASS    | PASS   | Desktop: 4 stats cards in a row, Quick Actions, Recommended postings section. Mobile: sidebar collapses to hamburger correctly, "New Posting" CTA moves to top of content, stats cards stack vertically. Responsive behavior correct.            |
| Postings        | /postings        | PASS    | PASS   | Discover/My Postings tabs, category chips (6 categories), search bar with voice input + filter icon all render. Card grid loads after spinner. Mobile layout reflows cleanly with chips wrapping correctly. See BUG-003, BUG-005 for loading UX. |
| New Posting     | /postings/new    | PASS    | PASS   | Fill Form / AI Extract tab switcher, AI Extract panel with example content and extraction button visible. "Back to postings" breadcrumb present. Clean layout on both viewports.                                                                 |
| Matches         | /matches         | PASS    | PASS   | "Profile Incomplete" empty state with icon, clear heading, descriptive text, and CTA. Informative and not blank. Clean layout on both viewports.                                                                                                 |
| Bookmarks       | /bookmarks       | PASS    | PASS   | 3 bookmark cards render with full content. Desktop shows full-width cards. Mobile reflows correctly.                                                                                                                                             |
| Inbox           | /inbox           | PASS    | PASS   | Notifications and Messages tabs visible. Empty state for notifications is clear and iconographic. Clean on both viewports.                                                                                                                       |
| Profile         | /profile         | PASS    | PASS   | Redesigned AI-assisted profile: "Your Profile" header, email, Edit Profile button, GitHub enrichment card, Quick Update AI panel. Mobile layout reflows cleanly.                                                                                 |
| Settings        | /settings        | PASS    | PASS   | Account info and Connected Accounts sections both visible and populated. Sign out button is accessible in the main content area of /settings (not the header dropdown). Clean on both viewports.                                                 |
