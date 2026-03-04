# Mesh Mobile UX Test Report — 2026-03-01

## Summary

- **Focus**: Mobile layout & UX issues only
- **Viewport**: 375×812 (iPhone-style), tested via production build (`pnpm build` + `pnpm start`)
- **Pages Tested**: 12 screens across 10 routes
- **Issues Found**: 14 (3 high, 6 medium, 5 low)

---

## Issues Overview

| #   | Severity | Page           | Issue                                                        |
| --- | -------- | -------------- | ------------------------------------------------------------ |
| 1   | 🔴 HIGH  | Create Posting | Browser-default scrollbar on suggestion chips                |
| 2   | 🔴 HIGH  | Settings       | Feedback FAB overlaps notification toggle switches           |
| 3   | 🔴 HIGH  | All pages      | Header icons too small for touch (36px, need ≥44px)          |
| 4   | 🟡 MED   | Create Posting | Feedback FAB overlaps "Post" button area                     |
| 5   | 🟡 MED   | All pages      | Search placeholder shows "(Ctrl+K)" — irrelevant on mobile   |
| 6   | 🟡 MED   | Login / Signup | Buttons and inputs at 36px height, below 44px minimum        |
| 7   | 🟡 MED   | Settings       | iCal feed input + "Add iCal Feed" button cramped on one line |
| 8   | 🟡 MED   | Discover       | Category chips have no scroll affordance (hidden scrollbar)  |
| 9   | 🟢 LOW   | Login          | "Forgot password?" link very small touch target (~20px)      |
| 10  | 🟢 LOW   | Landing        | Header cramped — logo, theme toggle, and "Log in" very close |
| 11  | 🟢 LOW   | All pages      | Muted helper text low-contrast in bright environments        |
| 12  | 🟢 LOW   | Onboarding     | "Skip for now" / "Next" buttons could be taller for touch    |
| 13  | 🟡 MED   | All pages      | Sidebar drawer too wide on mobile — wastes screen space      |
| 14  | 🟢 LOW   | All pages      | Initial page load feels slow, especially on mobile           |

---

## Detailed Findings

### 🔴 HIGH — #1: Browser-default scrollbar on Create Posting suggestion chips

**Page**: `/postings/new`

The quick-suggestion chips ("weekday evenings", "flexible schedule", "weekends only", etc.) show a thick, browser-default horizontal scrollbar with arrow buttons. This severely breaks the modern aesthetic and wastes vertical space on mobile.

**Fix**: Apply `scrollbar-hide` or custom thin scrollbar CSS. Consider a gradient fade-out at the edges to indicate overflow instead.

![Create Posting scrollbar issue](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/postings_new_mobile_check_1772364583098.png)

---

### 🔴 HIGH — #2: Feedback FAB overlaps notification toggles on Settings

**Page**: `/settings` (scrolled to bottom, Notification Preferences section)

The floating feedback button (bottom-right corner, 48×48px) sits directly on top of the toggle switches in the last row of the Notification Preferences table. Users cannot interact with those toggles without accidentally hitting the feedback button.

**Fix**: Add sufficient `padding-bottom` to page content (e.g., `pb-20`) so toggles clear the FAB, or hide the FAB on the settings page.

![Settings toggle overlap](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/settings_mobile_bottom_1772364680960.png)

---

### 🔴 HIGH — #3: Header action icons undersized for touch (36px)

**Pages**: All authenticated pages (Discover, Active, My Postings, Connections, Profile, Settings)

The header bar contains 4 interactive elements packed tightly: hamburger menu, search input, theme toggle, notification bell, and user avatar. The icons use `h-9` (36px), which is below the 44px minimum recommended by Apple and Google for touch targets. Combined with tight spacing, accidental taps are likely.

**Fix**: Increase icon touch targets to `h-11` (44px) minimum, or add invisible padding to expand the tappable area. Consider collapsing the search bar into an icon on mobile that expands on tap.

![Header cramped](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/discover_top_mobile_1772364549817.png)

---

### 🟡 MED — #4: Feedback FAB overlaps "Post" button area on Create Posting

**Page**: `/postings/new`

The floating feedback button overlaps with the "Auto-format" / "Auto-clean" / action area at the bottom of the create posting form. When scrolled to the bottom, it competes with the primary "Post" action.

**Fix**: Provide more bottom padding or reposition the FAB on this page.

---

### 🟡 MED — #5: "(Ctrl+K)" keyboard shortcut shown on mobile

**Pages**: All authenticated pages with the search bar

The search placeholder reads `"Search postings, profiles. (Ctrl+K)"`. The Ctrl+K shortcut hint is meaningless on mobile and adds visual clutter to an already-narrow input.

**Fix**: Conditionally hide the shortcut hint on mobile viewports (media query or JS check).

---

### 🟡 MED — #6: Login/Signup form buttons and inputs too short

**Page**: `/login`, `/signup`

The "Sign in", "Sign up", OAuth buttons, and text inputs are all `h-9` (36px). For a mobile-first form, these should be at least 44px to support comfortable thumb tapping. The input fields do correctly use `text-base` (16px) which prevents iOS auto-zoom — that's good.

**Fix**: Increase form inputs and buttons to `h-11` (44px) or `h-12` (48px) on mobile.

![Login page](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/login_page_mobile_1772364360020.png)

---

### 🟡 MED — #7: Calendar Sync iCal inline layout cramped

**Page**: `/settings` (Calendar Sync section)

The iCal feed URL input and "+ Add iCal Feed" button sit side-by-side on the same line. On a 375px viewport, this leaves very little room for the URL input and may overflow on narrower devices (e.g., iPhone SE at 320px).

**Fix**: Stack the input and button vertically on mobile (`flex-col` at `sm:` breakpoint).

![Settings calendar section](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/settings_mobile_bottom_1772364680960.png)

---

### 🟡 MED — #8: Discover category chips — no scroll affordance

**Page**: `/discover`

The category chips (All, Study, Hackathon, Personal, Professional, Social...) overflow horizontally with `scrollbar-hide`. The last chip is clipped ("Soci..." visible), which is a weak scroll hint. There's no gradient, arrow, or other visual cue that more items exist.

**Fix**: Add a subtle right-edge gradient fade or a small "→" indicator to signal more chips are available.

---

### 🟢 LOW — #9: "Forgot password?" link tiny touch target

**Page**: `/login`

The "Forgot password?" link is approximately 14px text with no extra padding, making the tappable area roughly 14–20px tall. Very hard to hit accurately.

**Fix**: Add vertical padding (`py-2`) to this link.

---

### 🟢 LOW — #10: Landing page header elements cramped

**Page**: `/` (logged out)

On mobile, the header shows "M Mesh - Development", theme toggle, and "Log in" very close together. Not a functional break, but the spacing feels tight.

![Landing header](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/landing_top_mobile_1772364811662.png)

---

### 🟢 LOW — #11: Low-contrast muted text

**Pages**: Multiple (Discover subtitle, Active subtitle, etc.)

Helper text like "Find postings that match your skills and interests" uses a muted-foreground color that may be difficult to read in bright outdoor lighting conditions.

**Fix**: Consider a slightly higher-contrast variant for mobile.

---

### 🟢 LOW — #12: Onboarding buttons slightly small

**Page**: `/onboarding`

The "Skip for now", "Next", "Back", and "Review" buttons work well but are at the smaller end of comfortable touch targets. Not critical given the low frequency of use.

![Onboarding](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/onboarding_step1_mobile_1772364920469.png)

---

### 🟡 MED — #13: Sidebar drawer too wide on mobile

**Pages**: All authenticated pages (via hamburger menu)

The sidebar navigation drawer takes up roughly 50% of the 375px viewport (~250px). The nav labels are all short ("Discover", "Active", "Profile", etc.) so the drawer doesn't need to be that wide. The excessive width makes the drawer feel heavy and desktop-oriented rather than mobile-native.

**Fix**: Reduce sidebar width to ~200–220px on mobile viewports, or use a percentage like `w-[60vw]` with a max-width. Tighten internal padding slightly while keeping touch targets ≥44px.

![Sidebar too wide](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/sidebar_mobile_1772364696977.png)

---

### 🟢 LOW — #14: Slow initial page load on mobile

**Pages**: All pages (first load)

The initial page load feels noticeably slow, especially on mobile networks. For a coordination-focused app that should feel like a messaging app, the first load needs to feel instant. This was also observed on the Vercel dev deployment.

**Fix**: Investigate bundle size (Next.js bundle analyzer), aggressive code splitting, and ensuring the service worker (PWA) caches the app shell for instant repeat loads. Consider Capacitor for a native wrapper that preloads the web app.

---

## What Works Well ✅

| Aspect                     | Notes                                                                 |
| -------------------------- | --------------------------------------------------------------------- |
| **No horizontal overflow** | Zero pages showed unwanted horizontal scroll at 375px                 |
| **Content stacking**       | Cards, sections, and forms all stack vertically correctly             |
| **Sidebar navigation**     | Hamburger → drawer pattern works cleanly, good icon+label layout      |
| **Login form text size**   | 16px input text prevents iOS auto-zoom — correct choice               |
| **Profile page**           | Cards (GitHub, Quick Update, General Info, Integrations) stack well   |
| **Landing page**           | Hero, feature cards, sample postings — all reflow cleanly to mobile   |
| **Onboarding flow**        | Simple, clear 3-step flow with good progress indicator ("1 of 3")     |
| **Empty states**           | Active, My Postings, Connections all show clear, helpful empty states |
| **Dark theme consistency** | Dark theme is consistent and well-executed across all pages           |

---

## Screenshots Gallery

```carousel
![Login](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/login_page_mobile_1772364360020.png)
<!-- slide -->
![Discover](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/discover_top_mobile_1772364549817.png)
<!-- slide -->
![Create Posting](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/postings_new_mobile_check_1772364583098.png)
<!-- slide -->
![Active](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/active_mobile_1772364562596.png)
<!-- slide -->
![My Postings](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/my_postings_mobile_1772364569772.png)
<!-- slide -->
![Connections](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/connections_mobile_1772364647398.png)
<!-- slide -->
![Profile Top](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/profile_mobile_top_1772364658954.png)
<!-- slide -->
![Profile Bottom](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/profile_mobile_bottom_1772364664863.png)
<!-- slide -->
![Settings Top](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/settings_mobile_top_1772364675959.png)
<!-- slide -->
![Settings Bottom](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/settings_mobile_bottom_1772364680960.png)
<!-- slide -->
![Sidebar](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/sidebar_mobile_1772364696977.png)
<!-- slide -->
![Landing Hero](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/landing_top_mobile_1772364811662.png)
<!-- slide -->
![Landing Features](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/landing_middle_mobile_1772364818932.png)
<!-- slide -->
![Onboarding Step 1](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/onboarding_step1_mobile_1772364920469.png)
<!-- slide -->
![Onboarding Step 3](/home/ajb/.gemini/antigravity/brain/3990c23a-98dc-4d94-9efb-f33aa234005b/onboarding_step3_mobile_1772364945917.png)
```

---

## Test Environment

- **Build**: `pnpm build` (production, webpack)
- **Server**: `pnpm start` (`next start` on port 3000)
- **Viewport**: 375×812 (iPhone simulation)
- **Browser**: Chromium headless (automated)
- **Date**: 2026-03-01
