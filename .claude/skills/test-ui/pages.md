# Page Registry

Pages to test, grouped by access level. Routes confirmed from `src/app/`.

## Public Pages

| Page            | Route              | Key Elements                                                                   |
| --------------- | ------------------ | ------------------------------------------------------------------------------ |
| Landing         | `/`                | Hero section, CTA buttons, redirects to `/dashboard` if logged in              |
| Login           | `/login`           | Email input, password input, sign in button, forgot password link, signup link |
| Sign Up         | `/signup`          | Registration form, link to login                                               |
| Forgot Password | `/forgot-password` | Email input, submit button                                                     |
| Reset Password  | `/reset-password`  | New password form                                                              |

## Auth Flow Pages

| Page                 | Route                   | Key Elements                  |
| -------------------- | ----------------------- | ----------------------------- |
| Onboarding           | `/onboarding`           | Onboarding wizard/steps       |
| Developer Onboarding | `/onboarding/developer` | Developer-specific onboarding |

## Protected Pages (Dashboard Layout)

All protected pages share the **AppShell** layout with:

- **Sidebar**: 7 nav items (Dashboard, Postings, Matches, Bookmarks, Inbox, Profile, Settings) + "New Posting" CTA button
- **Header**: Search input, notification bell, theme toggle (sun/moon), avatar dropdown
- **Mobile**: Sidebar collapses to hamburger menu

| Page           | Route            | Key Elements                                                                               |
| -------------- | ---------------- | ------------------------------------------------------------------------------------------ |
| Dashboard      | `/dashboard`     | Stats cards, quick actions, recommendations section, recent activity list                  |
| Postings       | `/postings`      | Discover/My Postings tabs, search bar, filter controls, category chips, posting cards grid |
| New Posting    | `/postings/new`  | AI extract option, manual form (title, description, skills, category, etc.)                |
| Posting Detail | `/postings/[id]` | Posting info, apply/bookmark buttons, applicant list (if owner)                            |
| Matches        | `/matches`       | AI-matched posting cards, search/filters, or empty state                                   |
| Bookmarks      | `/bookmarks`     | Saved posting cards, or empty state message                                                |
| Inbox          | `/inbox`         | Notifications tab, conversations/chat tab, message list                                    |
| Profile        | `/profile`       | Profile form (name, bio, skills, etc.), GitHub integration card                            |
| Settings       | `/settings`      | Account settings, linked providers section                                                 |
