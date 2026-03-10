# Mobile Layout Audit — 2026-03-07

## Summary

Comprehensive audit of mobile layout issues combining user feedback (from dev database), previous browser test reports, live Chrome inspection, and source code analysis.

- **Viewport tested**: 455x668 (Linux tiling WM approximation of 412x924 mobile)
- **User feedback device**: Android, 412x924, 2.625 DPR, light mode
- **Pages inspected**: Landing, Login, Posts, Discover, Connections, Profile, Settings, New Posting, Posting Detail
- **Issues found**: 15 (3 critical, 5 high, 4 medium, 3 low)

---

## User Feedback (from dev database)

4 feedback entries submitted from Android device on 2026-03-06:

1. **Posts page layout is "weird"** — screenshot shows title/description duplication, filter chips with scrollbar
2. **Bottom navigation bar is useless** — user says "The lower navigation bar is kind of useless on mobile, so let's remove it. The tab above replaces pretty much everything so we can get rid of the lower bar"
3. **Discover page layout** — "The general layout can be improved here, also the open label"
4. **Posting detail** — "see screenshot" — shows invite error state, general layout concerns

---

## Issues

### CRITICAL

#### C1: No bottom tab bar on mobile

- **Spec**: `1-ux.md` mandates a bottom tab bar with Discover / Posts / Connections on mobile (`<768px`)
- **Actual**: No bottom bar component exists in the codebase. The sidebar is `hidden md:flex` (desktop-only) and nothing replaces it on mobile.
- **Impact**: Mobile users have NO primary navigation. The only way to switch between Discover/Posts/Connections is to use the header avatar menu or type URLs.
- **Files**: `src/components/layout/app-shell.tsx` (missing bottom bar), `src/components/layout/sidebar.tsx` (hidden on mobile)
- **User feedback**: Directly called out — user notes the bottom bar (if it exists) is redundant with page tabs, but the real issue is navigation between pages is missing entirely.

#### C2: Title/description duplication on posting cards (Posts page)

- **Location**: `src/components/posting/unified-posting-card.tsx:152,196-208`
- **Root cause**: `extractTitleFromDescription()` takes the first line of description as the title fallback. The card then renders BOTH the extracted title AND the full description (which starts with the same text).
- **Result**: Cards show e.g. "XHacks Team - building accessibility checker" twice — once as bold title, once as muted description.
- **Fix**: When title was extracted from description, skip rendering the description, OR strip the first line from the description before rendering.

#### C3: Posting detail title truncated without ellipsis

- **Location**: `src/components/posting/posting-detail-header.tsx:122-124`
- **Code**: `<h1 className="text-3xl font-bold tracking-tight">` — no `truncate`, `line-clamp`, or `text-ellipsis`
- **For owner**: The title input (line 116-120) has `h-10` fixed height, so long titles are clipped inside the input.
- **Result**: "XHacks Team - building accessib" — hard truncation with no visual indicator.
- **Fix**: Allow wrapping (`line-clamp-3`) or add `truncate` with tooltip. For owner input, consider auto-resizing textarea.

### HIGH

#### H1: Browser-default scrollbar on Posts page filter chips

- **Location**: `src/app/(dashboard)/posts/page.tsx:70`
- **Code**: `overflow-x-auto scrollbar-none` — but `scrollbar-none` is NOT defined in globals.css
- **Compare**: Discover page (`src/components/posting/posting-filters.tsx:220`) uses `scrollbar-hide` which IS defined and works
- **Result**: Thick native scrollbar with arrow buttons appears below filter chips on both desktop Linux and Android mobile
- **Fix**: Replace `scrollbar-none` with `scrollbar-hide` (the custom utility that's already defined in `globals.css:457-463`)

#### H2: FAB "+" button shows on irrelevant pages

- **Location**: `src/components/layout/create-posting-fab.tsx:42-49`
- **Current hide conditions**: `/postings/new`, `/postings/*`, `/profile`, keyboard visible
- **Missing**: Does NOT hide on `/settings` or `/connections`
- **Result**: FAB overlaps content on Settings (covers LinkedIn "Connect" button, Danger Zone text) and Connections (meaningless — what would "+" create?)
- **Fix**: Add `/settings` and `/connections` to the hide list.

#### H3: No scroll affordance on horizontal chip rows

- **Pages**: Posts filter chips, Discover category chips
- **Issue**: Last chip is cut off ("Invite..." on Posts, "Professional..." on Discover) with no visual cue that more items exist
- **Fix**: Add a right-edge fade gradient overlay, or ensure the last visible chip is partially clipped (as a scroll hint). Both pages already do partial clipping but it's subtle.

#### H4: Discover page "New Posting" button wastes prime mobile real estate

- **Location**: `/discover` page
- **Issue**: Full-width "New Posting" button sits between the title and the search bar, pushing actual content (search, filters, postings) down. On a 70% mobile app, this button competes with the FAB "+" which already serves the same purpose.
- **Fix**: Remove or collapse the "New Posting" button on mobile (the FAB handles it), or move it inline with the page title.

#### H5: Discover card layout is vertically bloated

- **Issue**: Each Discover card shows: creator line, title, badges (category + status + match), bookmark icon (own line), "Request to join" button (full width), "View Details" button (full width). This means ~200px per card — only 2-3 cards visible without scrolling.
- **Contrast with use cases**: The "Coffee now" or "Chess. Intermediate. Munich." scenarios need fast scanning. Users should see 4-5 postings at a glance.
- **Fix**: Combine "Request to join" and "View Details" into a single row. Move bookmark inline with title. Reduce vertical spacing.

### MEDIUM

#### M1: Posting cards have no edit shortcut on Posts page

- **Location**: Posts page card layout
- **Issue**: In the user's feedback screenshot (from Vercel deploy), each card showed a pencil edit icon. In the current dev build, the edit icon is missing from the compact card variant — users must tap through to detail then switch to Edit tab.
- **Fix**: Add an edit icon button to compact cards when `role === "owner"`.

#### M2: Category chips on Discover lack scroll affordance

- **Location**: `src/components/posting/posting-filters.tsx:220`
- **Issue**: Uses `scrollbar-hide` (scrollbar hidden) but "Professional" is partially cut off — weak scroll hint. No gradient fade or arrow indicator.
- **Fix**: Add right-edge fade gradient.

#### M3: Connections page has excessive empty space

- **Issue**: The connections card ends at ~60% of viewport height, leaving a large black void below. On mobile, this feels broken.
- **Fix**: Make the connections list fill available height, or add contextual empty state content (e.g., "Add connections to start messaging").

#### M4: Login/signup buttons and inputs at 36px

- **Location**: `/login`, `/signup`
- **Issue**: Form elements are `h-9` (36px), below the 44px mobile minimum. Previously reported in the 2026-03-01 mobile UX test.
- **Fix**: Use `h-11` on mobile for form inputs and buttons.

### LOW

#### L1: "(Ctrl+K)" search hint shown on mobile

- **Location**: Discover search bar
- **Issue**: Placeholder includes "(Ctrl+K)" which is meaningless on mobile.
- **Fix**: Conditionally hide the shortcut hint at mobile breakpoints.

#### L2: Landing page header cramped

- **Issue**: "Mesh - Development", theme toggle, and "Log in" packed tightly in header.
- **Fix**: Minor spacing adjustment.

#### L3: Notification preferences column headers not visible after scroll

- **Location**: `/settings`, notification toggles section
- **Issue**: When scrolled to the notification toggles, the column headers (In-app / Push) are above the fold — can't tell which column is which.
- **Fix**: Consider sticky headers or inline labels.

---

## What Works Well

| Aspect                     | Notes                                                           |
| -------------------------- | --------------------------------------------------------------- |
| **Header touch targets**   | All header icons are `size-11` (44px) on mobile — compliant     |
| **No horizontal overflow** | No unwanted horizontal scroll on any page                       |
| **Content stacking**       | Cards and forms stack cleanly at narrow widths                  |
| **FAB speed-dial**         | Nice pattern — expand to show Create Posting + Feedback options |
| **Keyboard detection**     | FAB hides when mobile keyboard is open                          |
| **Dark theme**             | Consistent and well-executed across all pages                   |
| **Text-first compose**     | New posting page is clean and focused on mobile                 |
| **Profile page**           | Bio editor, skills badges, calendar — stacks well               |

---

## Recommended Priority Order

1. **C1: Bottom tab bar** — Critical navigation gap. Without it, mobile users are stuck.
2. **C2: Title/description duplication** — Every card looks broken. Quick fix.
3. **H1: Scrollbar on Posts chips** — One-line CSS fix (`scrollbar-none` -> `scrollbar-hide`).
4. **C3: Title truncation** — Visible on every posting detail page.
5. **H2: FAB visibility** — Quick fix, add 2 paths to hide list.
6. **H5: Discover card density** — Important for the core use case (scanning postings quickly).
7. **H4: Discover "New Posting" button** — Remove on mobile, FAB covers it.
8. **H3/M2: Scroll affordance** — Add fade gradient to chip rows.
9. **M4: Login button height** — Touch target compliance.
10. **Remaining M/L issues** — Lower priority polish.

---

## Cross-Reference: Previous Reports

| Issue                         | First reported                      | Status                                    |
| ----------------------------- | ----------------------------------- | ----------------------------------------- |
| Scrollbar on chips            | 2026-03-01 (Create Posting)         | Still present on Posts page               |
| FAB overlaps content          | 2026-03-01, 2026-03-06              | Still present on Settings/Connections     |
| Header icons 36px             | 2026-03-01                          | FIXED — now 44px on mobile                |
| Title truncation              | 2026-03-06, 2026-03-06 (text-first) | Still present                             |
| Login button height           | 2026-03-01                          | Not yet fixed                             |
| Bottom tab bar missing        | NEW                                 | Never existed                             |
| Title/description duplication | NEW                                 | Likely introduced with text-first compose |

---

## Test Environment

- **Browser**: Chrome (via Claude-in-Chrome)
- **Server**: dev server (localhost:3000)
- **Viewport**: 455x668 (tiling WM adjusted)
- **Date**: 2026-03-07
- **Branch**: dev (commit 4fa5fbf)
