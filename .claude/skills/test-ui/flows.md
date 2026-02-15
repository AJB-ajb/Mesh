# Flow Test Scripts

11 flow tests to execute in order. Each flow lists imperative steps.
Take a screenshot after each "Verify" step.

**Reminder**: Never submit forms, never create data, never change settings.

---

## Flow 1: Authentication

1. Navigate to `http://localhost:3000/login`
2. Verify: login form renders with email input, password input, sign in button
3. Verify: "Forgot password?" link is visible
4. Verify: link to sign up page is visible
5. Enter email: `ajb60721@gmail.com`
6. Enter password: (from `.env` `TEST_USER_PASSWORD`)
7. Click "Sign In"
8. Verify: redirected to `/dashboard`
9. Verify: dashboard content loads (not a blank page or error)

---

## Flow 2: Dashboard Navigation

1. Verify: sidebar is visible with navigation items
2. Verify: these sidebar items exist — Dashboard, Postings, Matches, Bookmarks, Inbox, Profile, Settings
3. Verify: "New Posting" button/CTA is visible in sidebar
4. Verify: header has search input, notification bell, theme toggle, avatar
5. Click "Postings" in sidebar
6. Verify: URL is `/postings`, page content loads
7. Click "Matches" in sidebar
8. Verify: URL is `/matches`, page content loads
9. Click "Bookmarks" in sidebar
10. Verify: URL is `/bookmarks`, page content loads
11. Click "Inbox" in sidebar
12. Verify: URL is `/inbox`, page content loads
13. Click "Profile" in sidebar
14. Verify: URL is `/profile`, page content loads
15. Click "Settings" in sidebar
16. Verify: URL is `/settings`, page content loads
17. Click "Dashboard" in sidebar
18. Verify: URL is `/dashboard`, back at dashboard

---

## Flow 3: Create Posting

1. Navigate to `/postings/new`
2. Verify: page loads with posting creation form
3. Verify: AI extract option is visible (if present)
4. Verify: form fields exist — title, description, skills/tags, category
5. Type a test title: "Test Posting Title"
6. Type a test description: "This is a test description for flow testing."
7. Verify: text appears correctly in the fields
8. **DO NOT click submit/create** — clear the fields or navigate away

---

## Flow 4: Browse Postings

1. Navigate to `/postings`
2. Verify: page loads with posting content
3. Verify: tabs exist (Discover / My Postings or similar)
4. Click "Discover" tab (or first tab)
5. Verify: posting cards or empty state message shown
6. Verify: search bar is visible
7. Type "test" in search bar
8. Verify: search input accepts text, results update or "no results" shown
9. Clear search
10. Verify: filter controls are visible (if any)
11. Verify: category chips are visible (if any)
12. Click a category chip (if available)
13. Verify: listings filter or update

---

## Flow 5: Posting Detail

1. From `/postings`, find a posting card
2. If no postings exist, verify empty state is shown and skip to next flow
3. Click on a posting card
4. Verify: URL changes to `/postings/[id]`
5. Verify: posting detail page loads with title, description
6. Verify: action buttons visible (apply, bookmark, or similar)
7. Click browser back or use breadcrumb navigation
8. Verify: returned to `/postings`

---

## Flow 6: Matches

1. Navigate to `/matches`
2. Verify: page loads without errors
3. Verify: either matched posting cards are shown OR an empty state message
4. If cards exist: verify they show posting information (title, skills, etc.)
5. If empty state: verify the message is informative (not blank or broken)
6. Verify: search or filter controls are present (if designed)

---

## Flow 7: Bookmarks

1. Navigate to `/bookmarks`
2. Verify: page loads without errors
3. Verify: either bookmarked posting cards are shown OR an empty state message
4. If cards exist: verify they show posting information
5. If empty state: verify the message is informative (not blank or broken)

---

## Flow 8: Inbox

1. Navigate to `/inbox`
2. Verify: page loads without errors
3. Verify: notifications section/tab is visible
4. Verify: conversations/chat section/tab is visible
5. Click on notifications tab (if tabbed interface)
6. Verify: notification list loads (items or empty state)
7. Click on conversations tab (if tabbed interface)
8. Verify: conversation list loads (items or empty state)

---

## Flow 9: Profile

1. Navigate to `/profile`
2. Verify: page loads without errors
3. Verify: profile form is visible with fields (name, bio, skills, etc.)
4. Verify: current user data is populated in the form
5. Verify: GitHub integration card/section is visible
6. **DO NOT save any changes**

---

## Flow 10: Settings

1. Navigate to `/settings`
2. Verify: page loads without errors
3. Verify: account settings section is visible
4. Verify: linked providers/accounts section is visible
5. **DO NOT change any settings**

---

## Flow 11: Sign Out

1. Find the avatar/user menu in the header
2. Click the avatar to open dropdown
3. Verify: dropdown menu appears with "Sign Out" option
4. Click "Sign Out"
5. Verify: redirected to `/login` or `/` (landing page)
6. Navigate to `/dashboard`
7. Verify: redirected to `/login` (session is cleared, route is protected)
