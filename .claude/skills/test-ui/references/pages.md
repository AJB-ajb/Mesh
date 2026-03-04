# Page Discovery Guide

This file guides dynamic route discovery. **Do not hardcode routes** — discover them at test time using the glob pattern below.

## Discovering Routes

```
Glob pattern="src/app/**/page.tsx"
```

### Interpreting the App Router Directory Structure

Next.js App Router uses the filesystem for routing. Key conventions:

- `src/app/page.tsx` → `/` (root/landing)
- `src/app/(group)/route/page.tsx` → `/route` (parenthesized directories are **route groups** — they organize code but don't appear in the URL)
- `src/app/route/[param]/page.tsx` → `/route/:param` (dynamic segment)
- `src/app/~offline/page.tsx` → special PWA offline fallback (skip in normal testing)

### Example Mapping

| File Path | URL Route | Group |
|-----------|-----------|-------|
| `src/app/page.tsx` | `/` | public |
| `src/app/(auth)/login/page.tsx` | `/login` | auth |
| `src/app/(auth)/signup/page.tsx` | `/signup` | auth |
| `src/app/(dashboard)/discover/page.tsx` | `/discover` | protected |
| `src/app/(dashboard)/postings/[id]/page.tsx` | `/postings/:id` | protected |

## Route Groups

### Public Pages

Route group: none (root) or informational pages.

- **Landing page** (`/`): Hero section, CTA buttons. Redirects to the authenticated home if logged in.
- **Static/info pages** (e.g. `/why`): Marketing or informational content.

**What to test**: Content renders, CTAs are clickable, redirect works for authenticated users.

### Auth Flow Pages

Route group: `(auth)`. These handle login, registration, and password flows.

- **Login** (`/login`): Email + password form, OAuth buttons, links to signup and forgot password.
- **Signup** (`/signup`): Registration form.
- **Forgot Password** (`/forgot-password`): Email input to request reset.
- **Reset Password** (`/reset-password`): New password form (requires token — skip unless testing the flow end-to-end).
- **Onboarding** (`/onboarding`, `/onboarding/developer`): Post-registration setup wizard.

**What to test**: Forms render with correct inputs, validation messages appear, OAuth buttons are present, links navigate correctly.

### Protected Pages (Dashboard)

Route group: `(dashboard)`. All share the **AppShell** layout.

**AppShell layout elements** (verify once during navigation flow):
- **Sidebar**: Nav items for each dashboard route + "New Posting" CTA
- **Header**: Search input (Ctrl+K), notification bell, theme toggle, avatar dropdown
- **Mobile**: Sidebar collapses to hamburger menu

**What to test on each protected page**:

- **Discover**: Search bar, category filter chips, posting cards with match %, action buttons
- **My Postings**: Search, filters, posting cards with owner controls (Edit, Manage, Activity)
- **Active**: Tab switching (All, Created, Joined), posting cards with role/status badges
- **Connections**: Split-pane layout (connection list + chat panel), search, empty states
- **New Posting**: Tab toggle (AI Extract / Fill Form), CodeMirror editor, form fields
- **Posting Detail** (`/postings/:id`): Title, description, tags, info cards, compatibility section, creator sidebar, action buttons. Different views for owner vs visitor.
- **Profile**: Edit form, GitHub enrichment card, quick update section
- **Profile (other user)** (`/profile/:userId`): Read-only view of another user's profile
- **Posts**: Filter chips, posting list
- **Settings**: Account info, connected accounts, notification preferences

### Special Pages

- **Offline fallback** (`/~offline`): PWA offline page. Only test if specifically asked.

## Dynamic Segments

Pages with `[param]` in the path need a real ID to test. Get IDs from:
- **Posting ID**: Create a test posting in Flow 3, or find one on the discover page
- **User ID**: Use the logged-in user's profile or find one from a posting's creator

## What to Skip

- `~offline` page (PWA internal)
- `reset-password` (requires a valid token)
- `onboarding` pages (may alter account state — only test if explicitly asked)
