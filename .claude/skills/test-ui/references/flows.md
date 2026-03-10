# Flow Test Framework

Adaptive flow tests for Mesh. Discover the actual routes and features first (SKILL.md section 5), then execute these flow patterns. Each flow describes **what to test and why** — adapt the specific steps to whatever you find in the app.

Take a screenshot after each "Verify" step. Track any created entity IDs for cleanup.

**Stateful testing**: Prefix test data with `[TEST]`. Clean up afterward.

**Route discovery**: Do not hardcode routes. Use the route table from dynamic discovery. Verify actual routes before navigating.

---

## Flow 1: Authentication

**What**: Login form renders, credentials work, user lands in the authenticated app.
**Why**: If login is broken, nothing else can be tested.

1. Navigate to `/login`
2. Verify: form renders with email input, password input, submit button
3. Verify: OAuth/SSO buttons are visible and properly rendered
4. Verify: links to signup and forgot password are present
5. Enter User 1 credentials (see `spec/testing.md`)
6. Submit the form
7. Verify: redirected to an authenticated page (note the actual URL — don't assume)
8. Verify: page content loads with the app shell

---

## Flow 2: Navigation

**What**: The app shell works — all nav links lead to real pages, mobile nav adapts.
**Why**: Broken navigation makes features unreachable.

1. Identify all navigation items in the app shell
2. Click each nav item in order:
   - Verify: URL changes, page content loads without error
3. On mobile viewport (if testing mobile): verify nav collapses/adapts
   - Open mobile nav, verify items appear
   - Click an item, verify navigation works and menu closes
4. **Note any nav items that are confusing, redundant, or hard to find**

---

## Flow 3: Create Posting

**What**: Create a posting through the full creation flow, exercising whatever editor/form the app provides.
**Why**: Posting creation is a core Mesh feature. The form/editor and submission need real testing — read-only testing misses validation bugs, editor state issues, and API errors.

1. Navigate to the posting creation page
2. Verify: creation UI loads (form, editor, wizard — whatever exists)
3. Explore: what tabs/modes are available? Note them.
4. Fill required fields with test data — title: `[TEST] Automated Test Posting`, description with `[TEST]` prefix
5. Fill other fields as needed
6. Submit
7. Verify: posting is created (redirect to detail page, success message, etc.)
8. **Record the posting ID** from the URL or page content
9. **Note friction**: Was it obvious what was required? Was the editor intuitive? Was success/failure clear?

---

## Flow 4: Browse & Search

**What**: Find content using Mesh's discovery features.
**Why**: If users can't find postings, Mesh doesn't work.

1. Navigate to the discovery/browse page
2. Verify: posting cards/list renders
3. Test search: type a query, verify results update
4. Test filters: use whatever filter controls exist, verify content filters
5. Clear all filters, verify reset works
6. Test bookmark/save if available
7. **Note friction**: Is search responsive? Are filters intuitive? Is "no results" handled well?

---

## Flow 5: Posting Detail

**What**: View a posting from both owner and visitor perspectives, including multi-user interaction.
**Why**: The detail page has conditional rendering (owner vs. visitor) and the join/apply flow is core to Mesh.

### Owner View (User 1)

1. Navigate to the test posting from Flow 3
2. Verify: posting content displays correctly
3. Verify: owner actions are available (edit, manage, etc.)
4. Explore all sections/tabs on the page

### Visitor Interaction (User 2 via API)

5. Have User 2 request to join User 1's posting (via API — see SKILL.md section 6)
6. **Record the join request** for cleanup
7. Return to User 1's browser
8. Verify: the interaction is visible (notification, updated applicant count, etc.)
9. If accept/manage UI exists: interact with it
10. **Note friction**: Was it clear that someone applied? Was the accept/decline flow obvious?

---

## Flow 6: My Content

**What**: Find and manage your own postings.
**Why**: Users need to manage what they've created.

1. Navigate to the page that shows your own postings
2. Verify: the test posting from Flow 3 appears
3. Verify: management controls are visible
4. Test search/filter within the management view if available
5. **Note friction**: Easy to find your content? Management actions clear?

---

## Flow 7: Connections & Chat

**What**: Connection list, chat/messaging, and multi-user connection flow.
**Why**: Social features are core to Mesh and have complex state.

### Connection Request (User 2 via API)

1. Have User 2 send a connection request to User 1 (via API)
2. **Record the request** for cleanup

### User 1 Browser

3. Navigate to the connections page
4. Verify: layout loads (list view, split-pane, etc.)
5. Check for User 2's pending request
6. If visible: accept/interact with it
7. If conversations exist: open one, verify chat displays
8. **Note friction**: Is the connections layout intuitive? Is it clear how to respond to requests? Does chat feel responsive?

---

## Flow 8: Profile

**What**: View and edit the user profile — actually modify a field, verify, then revert.
**Why**: Profile editing tests form state, API persistence, and data round-tripping.

1. Navigate to the profile page
2. Verify: page loads with user information
3. **Record the current value** of a text field
4. Edit the field: append ` [TEST EDIT]`
5. Save
6. Verify: save succeeds
7. **Revert**: edit back to original, save again
8. Verify: field restored — record as reverted
9. **Note friction**: Was it obvious how to edit? Was save confirmation clear?

---

## Flow 9: Settings

**What**: Change a setting, verify persistence, revert.
**Why**: Settings toggles involve optimistic UI and API sync.

1. Navigate to the settings page
2. Verify: settings render with controls
3. **Record the current state** of a toggle
4. Change it
5. Reload the page
6. Verify: change persisted
7. **Revert**: change back
8. Verify: restored — record as reverted
9. **Note friction**: Settings grouped logically? Clear what each does?

---

## Flow 10: Sign Out

**What**: Sign out clears the session, protected routes redirect.
**Why**: Broken sign-out is a security issue.

1. Find the sign-out action
2. Click sign out
3. Verify: redirected to login or landing page
4. Navigate to a protected route
5. Verify: redirected to login (session cleared)
6. **Note friction**: Was sign-out easy to find?
