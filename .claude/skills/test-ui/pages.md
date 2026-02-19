# Page Registry

Pages to test, grouped by access level. Routes confirmed from browser testing 2026-02-19.

## Public Pages

| Page            | Route              | Key Elements                                                                                                             |
| --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Landing         | `/`                | Hero section, CTA buttons, redirects to `/active` if logged in                                                           |
| Login           | `/login`           | Email input, password input, sign in button, forgot password link, signup link, OAuth buttons (Google, GitHub, LinkedIn) |
| Sign Up         | `/signup`          | Registration form, link to login                                                                                         |
| Forgot Password | `/forgot-password` | Email input, submit button                                                                                               |
| Reset Password  | `/reset-password`  | New password form                                                                                                        |

## Auth Flow Pages

| Page                 | Route                   | Key Elements                  |
| -------------------- | ----------------------- | ----------------------------- |
| Onboarding           | `/onboarding`           | Onboarding wizard/steps       |
| Developer Onboarding | `/onboarding/developer` | Developer-specific onboarding |

## Protected Pages (AppShell Layout)

All protected pages share the **AppShell** layout with:

- **Sidebar**: 5 nav items (Discover, My Postings, Active, Connections) + secondary nav (Profile, Settings) + "New Posting" CTA button
- **Header**: Search input (Ctrl+K), notification bell, theme toggle (sun/moon), avatar dropdown (Profile, Settings, Sign out)
- **Mobile**: Sidebar collapses to hamburger menu

| Page           | Route            | Key Elements                                                                                                                                                                                                     |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discover       | `/discover`      | AI search bar, category chips (All/Study/Hackathon/Personal/Professional/Social), Saved filter, sort dropdown, posting cards with match %, compatibility breakdown, Request to join / View Details buttons       |
| My Postings    | `/my-postings`   | Search bar, category chips, filter icon, + New Posting button, posting cards with Edit / Manage / Activity buttons                                                                                               |
| Active         | `/active`        | All/Created/Joined tabs, posting cards with role badge (You created / You joined), status badge (open), Edit/Manage/Activity buttons                                                                             |
| Connections    | `/connections`   | Split-pane layout: left panel (search, connection list, + Add button, QR/share icons), right panel (chat view or empty state)                                                                                    |
| New Posting    | `/postings/new`  | Fill Form / AI Extract tab toggle. AI Extract: textarea with example, Extract button, mic icon. Fill Form: title, description (required), skills search, tags, estimated time, category, location                |
| Posting Detail | `/postings/[id]` | Title, status badge, expiry date, match %, description, skills, tags, info cards (team size, time, category, location), compatibility section, Posting Creator sidebar, actions (Request to join, Share, Report) |
| Profile        | `/profile`       | Back link, Edit Profile button, GitHub enrichment card, Quick Update (AI), General Information form                                                                                                              |
| Settings       | `/settings`      | Back link, Account info (email, type), Connected Accounts (Google/GitHub/LinkedIn), Notification Preferences                                                                                                     |
