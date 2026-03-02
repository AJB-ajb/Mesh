# Flow Test Scripts

10 flow tests to execute in order. Each flow lists imperative steps and explains what it's testing.

Take a screenshot after each "Verify" step. Track any created entity IDs for cleanup.

**Stateful testing**: These flows exercise full CRUD. Prefix test data with `[TEST]`. Clean up in the cleanup protocol after all tests.

**Route discovery**: Do not assume hardcoded routes. Use the route table from dynamic discovery (SKILL.md step 4). The routes referenced below (e.g. `/discover`, `/profile`) are examples — verify the actual route before navigating.

---

## Flow 1: Authentication

**What**: Verifies login form renders correctly, credentials work, and the user lands on the authenticated app.
**Why**: Authentication is the gateway — if login is broken, nothing else can be tested.

1. Navigate to `/login`
2. Verify: login form renders with email input, password input, sign in button
3. Verify: "Forgot password?" link is visible
4. Verify: link to sign up page is visible
5. Verify: OAuth provider buttons visible (Google, GitHub, LinkedIn)
6. Enter email: `ajb60721@gmail.com`
7. Enter password: (from `.env` `TEST_USER_PASSWORD`)
8. Click "Sign In"
9. Verify: redirected to an authenticated page (note the actual URL — do not assume a specific route)
10. Verify: page content loads with the app shell (sidebar, header)

---

## Flow 2: Navigation

**What**: Verifies the app shell — sidebar items, header controls, and that all sidebar links navigate to the correct pages.
**Why**: Navigation is the skeleton of the app. Broken links or missing nav items make features unreachable.

1. Verify: sidebar is visible with navigation items
2. Verify: the sidebar contains nav items matching the discovered dashboard routes (e.g. Discover, My Postings, Active, Connections)
3. Verify: secondary nav items exist (Profile, Settings)
4. Verify: "New Posting" button/CTA is visible in sidebar
5. Verify: header has search input, notification bell, theme toggle, avatar
6. Click each sidebar nav item in order:
   - For each: verify URL changes to the expected route, page content loads without error
7. On mobile viewport (if testing mobile): verify sidebar collapses to hamburger menu
   - Open hamburger menu, verify nav items appear
   - Click a nav item, verify navigation works and menu closes

---

## Flow 3: Create Posting

**What**: Actually creates a posting through the full form flow, verifying field inputs, the CodeMirror editor, and submission.
**Why**: Posting creation is a core feature. The CodeMirror 6 editor and form validation need real submission testing — read-only testing misses validation bugs, editor state issues, and API errors.

1. Navigate to the new posting page (discovered route, likely `/postings/new`)
2. Verify: page loads with "AI Extract" tab active by default
3. Verify: AI extract textarea with placeholder example is visible
4. Verify: "Extract Posting Details" and "Switch to Form" buttons visible
5. Click the "Fill Form" tab
6. Verify: form fields exist — Title, Description (CodeMirror editor), Skills, Tags, Category, etc.
7. Enter title: `[TEST] Automated Test Posting`
8. Click into the CodeMirror editor for description
9. Type a test description: `[TEST] This posting was created by the automated UI test skill. It will be deleted after testing.`
   - *Note*: CodeMirror is not a standard `<textarea>`. Click into the `.cm-editor` element and type. If `form_input` doesn't work, use `computer` tool with `left_click` on the editor area followed by `type`.
10. Fill other required fields as needed (category, etc.)
11. Click the submit/create button
12. Verify: posting is created successfully (redirect to posting detail or success message)
13. **Record the posting ID** from the URL or page content — add to test-data tracking list
14. Take screenshot of the created posting

---

## Flow 4: Browse & Filter

**What**: Tests the discover page's search, filtering, and bookmark functionality.
**Why**: Discovery is how users find postings. Search and filter bugs directly impact usability.

1. Navigate to the discover page (discovered route, likely `/discover`)
2. Verify: page loads with posting cards
3. Verify: search bar is visible with placeholder
4. Verify: category chips are visible
5. Verify: sort/filter controls are visible
6. Type "test" in the search bar
7. Verify: search input accepts text, results update or "no results" message shown
8. Clear the search input
9. Click a category chip (e.g. the second one)
10. Verify: chip highlights, listings filter
11. Click the "All" chip to reset
12. Find a posting card and click the bookmark/save toggle
13. Verify: bookmark state changes (icon fills or unfills)
14. **Record the bookmark action** in test-data tracking list
15. Toggle bookmark back to original state (undo)

---

## Flow 5: Posting Detail

**What**: Tests the posting detail page from both the owner's and a visitor's perspective, including multi-user interaction.
**Why**: The posting detail page has different views for owners vs visitors. The "request to join" flow is a core multi-user interaction.

### Owner View (User 1)

1. Navigate to the test posting created in Flow 3 (use the recorded ID)
2. Verify: posting detail page loads with title, description, tags
3. Verify: owner-specific controls are visible (Edit, Manage, etc.)
4. Verify: posting info cards visible (team size, time, category, etc.)

### Visitor View (User 2 via API)

5. Using the multi-user API pattern (SKILL.md section 6), have User 2 request to join User 1's test posting
6. **Record the join request** in test-data tracking list
7. Switch back to User 1's browser view
8. Verify: User 1 sees a notification or updated applicant count for the test posting
9. If an accept/manage UI exists: accept User 2's request
10. Verify: state updates (connection opens, status changes, etc.)

---

## Flow 6: Posts Page

**What**: Tests the posts/my-postings page — filters, search, and that the test posting appears.
**Why**: Users need to find and manage their own postings. This verifies the owner-facing posting list works.

1. Navigate to the my-postings page (discovered route, likely `/my-postings`)
2. Verify: page loads with heading and posting list
3. Verify: search bar and filter controls visible
4. Verify: the test posting from Flow 3 appears in the list (search for `[TEST]` if needed)
5. Verify: posting cards show management controls (Edit, Manage, Activity)
6. Navigate to the posts page if it exists (discovered route, likely `/posts`)
7. If posts page exists: verify filter chips, content loads

---

## Flow 7: Connections

**What**: Tests the connections page — list view, split-pane chat, and multi-user connection flow.
**Why**: Connections and messaging are core social features. The split-pane layout is complex and frequently has responsive issues.

### Connection Request (User 2 via API)

1. Using the multi-user API pattern, have User 2 send a connection request to User 1
2. **Record the connection request** in test-data tracking list

### User 1 Browser

3. Navigate to the connections page (discovered route, likely `/connections`)
4. Verify: page loads with split-pane layout
5. Verify: left panel has search bar and connection list (or pending requests)
6. Verify: right panel shows placeholder or a chat view
7. If User 2's connection request is visible: interact with it (accept/view)
8. If connections exist: click on one, verify chat view loads in right panel
9. If empty: verify the empty state message is informative

---

## Flow 8: Profile

**What**: Tests profile viewing and editing — actually modifies a field, verifies the save, then reverts.
**Why**: Profile editing involves form state, API calls, and data persistence. Read-only testing misses save/validation bugs.

1. Navigate to the profile page (discovered route, likely `/profile`)
2. Verify: page loads without errors
3. Verify: heading with email displayed
4. Verify: GitHub Profile Enrichment card is visible
5. Verify: profile description / bio field is visible
6. **Record the current value** of a text field (e.g. bio or "What changed?")
7. Edit the field: append ` [TEST EDIT]` to the current value
8. Save the changes (click the save/update button)
9. Verify: save succeeds (success message or no error)
10. Take screenshot
11. **Revert**: edit the field back to the original value, save again
12. Verify: field is back to original — **record in tracking list** as reverted

---

## Flow 9: Settings

**What**: Tests settings page controls — actually toggles a preference, verifies persistence, then reverts.
**Why**: Settings toggles involve optimistic UI updates and API calls. Testing without toggling misses state sync bugs.

1. Navigate to the settings page (discovered route, likely `/settings`)
2. Verify: page loads without errors
3. Verify: Account section shows email and account type
4. Verify: Connected Accounts section shows providers (Google, GitHub, LinkedIn)
5. Verify: Notification Preferences section is visible
6. **Record the current state** of a notification toggle
7. Toggle it (click to flip its state)
8. Verify: toggle state changes visually
9. Reload the page
10. Verify: toggle state persisted after reload
11. **Revert**: toggle it back to the original state
12. Verify: toggle is back to original — **record in tracking list** as reverted

---

## Flow 10: Sign Out

**What**: Tests sign-out and session clearing — verifies protected routes redirect to login.
**Why**: Broken sign-out is a security issue. Session leaks mean users can't switch accounts or secure their session.

1. Find the avatar/user menu in the header
2. Click the avatar to open the dropdown
3. Verify: dropdown menu appears with Profile, Settings, and "Sign out" options
4. Click "Sign out"
5. Verify: redirected to `/login` (or landing page)
6. Navigate to a protected route (e.g. `/discover`)
7. Verify: redirected to `/login` (session is cleared, route is protected)
