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
5. Verify: OAuth provider buttons visible (Google, GitHub, LinkedIn)
6. Enter email: `ajb60721@gmail.com`
7. Enter password: (from `.env` `TEST_USER_PASSWORD`)
8. Click "Sign In"
9. Verify: redirected to `/active`
10. Verify: page content loads (not a blank page or error)

---

## Flow 2: Sidebar Navigation

1. Verify: sidebar is visible with navigation items
2. Verify: these sidebar items exist — Discover, My Postings, Active, Connections, Profile, Settings
3. Verify: "New Posting" button/CTA is visible in sidebar
4. Verify: header has search input, notification bell, theme toggle, avatar
5. Click "Discover" in sidebar
6. Verify: URL is `/discover`, page content loads
7. Click "My Postings" in sidebar
8. Verify: URL is `/my-postings`, page content loads
9. Click "Active" in sidebar
10. Verify: URL is `/active`, page content loads
11. Click "Connections" in sidebar
12. Verify: URL is `/connections`, page content loads
13. Click "Profile" in sidebar
14. Verify: URL is `/profile`, page content loads
15. Click "Settings" in sidebar
16. Verify: URL is `/settings`, page content loads
17. Click "Active" in sidebar
18. Verify: URL is `/active`, back at home

---

## Flow 3: Create Posting

1. Navigate to `/postings/new`
2. Verify: page loads with "AI Extract" tab active by default
3. Verify: AI extract textarea with placeholder example is visible
4. Verify: "Extract Posting Details" and "Switch to Form" buttons visible
5. Click "Fill Form" tab
6. Verify: form fields exist — Posting Title, Description (required), Required Skills, Tags, Category
7. Type a test title: "Test Posting Title"
8. Type a test description: "This is a test description for flow testing."
9. Verify: text appears correctly in the fields
10. **DO NOT click submit/create** — navigate away

---

## Flow 4: Browse Postings (Discover)

1. Navigate to `/discover`
2. Verify: page loads with posting cards
3. Verify: search bar is visible with placeholder
4. Verify: category chips are visible (All, Study, Hackathon, Personal, Professional, Social)
5. Verify: "Saved" button and sort dropdown are visible
6. Type "test" in search bar
7. Verify: search input accepts text, results update or "No postings found." shown
8. Clear search (select all + delete)
9. Click a category chip (e.g. "Study")
10. Verify: chip highlights, listings filter or update
11. Click "All" to reset

---

## Flow 5: Posting Detail

1. From `/discover`, find a posting card with "View Details" button
2. If no postings exist, verify empty state is shown and skip to next flow
3. Click "View Details" on a posting card
4. Verify: URL changes to `/postings/[id]`
5. Verify: posting detail page loads with title, description, tags
6. Verify: compatibility section with match percentage is visible
7. Verify: "Posting Creator" sidebar with "Contact Creator" button
8. Verify: action buttons visible (Request to join, Share Posting, Report Issue)
9. Click "Back to postings" breadcrumb or browser back
10. Verify: returned to `/discover`

---

## Flow 6: My Postings

1. Navigate to `/my-postings`
2. Verify: page loads with "My Postings" heading
3. Verify: search bar and filter controls are visible
4. Verify: category chips are visible
5. Verify: posting cards show Edit / Manage / Activity buttons
6. If no postings exist, verify empty state is informative

---

## Flow 7: Active Postings

1. Navigate to `/active`
2. Verify: page loads with "Active" heading
3. Verify: tabs exist — All, Created, Joined
4. Click "Created" tab
5. Verify: tab highlights, content updates to show only created postings
6. Click "Joined" tab
7. Verify: tab highlights, content updates to show only joined postings
8. Click "All" tab to reset

---

## Flow 8: Connections

1. Navigate to `/connections`
2. Verify: page loads with split-pane layout
3. Verify: left panel has search bar and connection list (or empty state)
4. Verify: right panel shows "Select a connection to start chatting" or a chat view
5. Verify: "+ Add" button is visible at the bottom of the left panel
6. If connections exist: verify they show user information
7. If empty state: verify the message is informative ("No connections yet")

---

## Flow 9: Profile

1. Navigate to `/profile`
2. Verify: page loads without errors
3. Verify: "Your Profile" heading with email displayed
4. Verify: GitHub Profile Enrichment card is visible
5. Verify: Quick Update section with profile description and "What changed?" field
6. Verify: General Information section is visible with user data
7. **DO NOT save any changes**

---

## Flow 10: Settings

1. Navigate to `/settings`
2. Verify: page loads without errors
3. Verify: Account section shows email and account type
4. Verify: Connected Accounts section shows Google, GitHub, LinkedIn providers
5. Verify: Notification Preferences section is visible
6. **DO NOT change any settings**

---

## Flow 11: Sign Out

1. Find the avatar/user menu in the header
2. Click the avatar to open dropdown
3. Verify: dropdown menu appears with Profile, Settings, and "Sign out" options
4. Click "Sign out"
5. Verify: redirected to `/login`
6. Navigate to `/active`
7. Verify: redirected to `/login` (session is cleared, route is protected)
