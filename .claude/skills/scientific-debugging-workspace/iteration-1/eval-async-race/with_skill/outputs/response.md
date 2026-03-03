# Scientific Debugging Analysis: Intermittent User Cross-Contamination

## Mode Switch

Two fix attempts (null checks and try/catch wrapping) haven't resolved this. I'm switching to hypothesis-driven debugging -- I'll diagnose before making more changes.

## Step 2: What I Know and What Confuses Me

### Observed behavior

- Under concurrent load, user A sometimes receives user B's permissions, or vice versa.
- `getCurrentUser()` (used by logging middleware) sometimes returns the wrong user.
- The bug is intermittent and only manifests under concurrent requests, never during single-user testing.
- No errors are thrown -- the data is present, it's just the _wrong_ data.

### Expected behavior

- Each request should see only its own user's profile and permissions.
- `getCurrentUser()` should return the user associated with the _current_ request.

### Confusions

- **Null checks didn't help.** The user confirmed the object is not null -- it's just the wrong user. This rules out missing data and points toward data from a _different_ request leaking in.
- **Try/catch didn't help.** No errors are thrown. The system behaves "normally" -- it just serves the wrong data. This rules out transient fetch failures.
- **Only under concurrency.** This is the strongest signal. Single-user testing works perfectly, meaning the logic itself is correct for one request at a time. The problem only appears when multiple requests overlap in time.

## Step 3: Hypotheses

### H1: Shared mutable module-level state (`currentUser`) causes a race condition

- **Description:** `currentUser` is declared at module scope (`let currentUser = null`). In Node.js, modules are singletons -- every request handler shares the same `currentUser` variable. When `getEnrichedUser` is called concurrently for two different users, one call overwrites `currentUser` before the other finishes, causing cross-contamination.
- **Supporting evidence:**
  - `currentUser` is module-level mutable state, shared across all callers.
  - `getEnrichedUser` has two `await` points (`fetchUserProfile` and `fetchUserPermissions`). Between these awaits, the event loop can interleave another call that overwrites `currentUser`.
  - The bug only appears under concurrency -- exactly what you'd expect from a shared-state race condition.
  - `getCurrentUser()` simply returns whatever `currentUser` is set to, meaning any caller from any request gets whatever was last written.
- **Contradicting evidence:** None. This fits all observations perfectly.
- **Testability:** High.

### H2: The fetch calls are returning cached/stale responses from a shared HTTP cache

- **Description:** Perhaps the `/api/users/:id` or `/api/users/:id/permissions` endpoints are returning cached responses from a previous request, causing user A to see user B's data.
- **Supporting evidence:** Could explain wrong data without errors.
- **Contradicting evidence:** The URLs include the userId, so cache keys would differ per user. The user reports the user object IS there (not null), just wrong -- if caching were the issue, you'd typically see the _same_ stale user for everyone, not a random swap. Also, single-user testing works fine, and caching bugs wouldn't typically depend on concurrency.
- **Testability:** Medium -- would require inspecting HTTP cache headers.

### H3: The userId parameter is itself wrong (upstream bug in middleware routing)

- **Description:** Perhaps the auth middleware is passing the wrong userId to `getEnrichedUser` due to a routing/parsing bug under concurrent load.
- **Supporting evidence:** Would explain why the "wrong user" is returned.
- **Contradicting evidence:** This would be an upstream bug, not in this module. The user specifically reported the problem is in userService.js. Also, if the wrong userId were passed, `fetchUserProfile` and `fetchUserPermissions` would at least be consistent with each other (both for the wrong user), but the reported symptom is that user A gets user B's _permissions_ -- suggesting the profile and permissions can come from different users, which points at interleaving within this function, not a wrong input.
- **Testability:** Medium -- would require adding logging of the userId parameter at entry.

## Step 4: Experiment Design

### Experiment 1: Trace the interleaving (tests H1 directly)

Walk through the execution timeline when two concurrent calls overlap:

```
Timeline with Request A (userId=1) and Request B (userId=2):

T1: Request A calls getEnrichedUser(1)
T2: Request A: currentUser = await fetchUserProfile(1)
    --> currentUser is now User1
    --> await suspends, event loop is free

T3: Request B calls getEnrichedUser(2)    <-- interleaves here
T4: Request B: currentUser = await fetchUserProfile(2)
    --> currentUser is now User2 (OVERWRITES User1!)
    --> await suspends

T5: Request A resumes: fetchUserPermissions(1)
    --> await suspends

T6: Request B resumes: fetchUserPermissions(2)
    --> await suspends

T7: Request A resumes: currentUser.permissions = permissions_for_1
    --> But currentUser is User2 (set at T4)!
    --> User2 now has User1's permissions!
    --> Returns User2 (with User1's permissions) to Request A

T8: Request B resumes: currentUser.permissions = permissions_for_2
    --> currentUser is still User2
    --> Returns User2 (with User2's permissions) to Request B
```

**Result of thought experiment:** H1 is confirmed. The interleaving clearly shows:

1. Request A receives User2's profile (wrong user) with User1's permissions (wrong permissions for that user).
2. `getCurrentUser()` returns whichever user was last written, which could be from any request.

This perfectly explains every reported symptom:

- User A gets user B's data (or vice versa).
- Logging middleware (`getCurrentUser()`) logs the wrong user.
- No errors are thrown -- the data is valid, just from the wrong request.
- Only happens under concurrency -- single requests never interleave.

### Why the previous fixes failed

1. **Null checks:** `currentUser` is never null during the race. It's always set to _some_ user object -- just the wrong one. Null checks can't detect "wrong but valid" data.

2. **Try/catch around `getEnrichedUser`:** No exception is thrown. The fetches succeed, the assignments succeed. The bug is a logic error (shared mutable state), not an exceptional condition.

## Step 5: Findings

H1 (shared mutable module-level state race condition) is confirmed with high confidence. The interleaving analysis demonstrates exactly how the bug manifests. H2 and H3 are ruled out -- H2 doesn't match the concurrency-dependent symptom pattern, and H3 doesn't explain cross-contamination between profile and permissions.

## Step 6: The Fix

**Root cause:** The module-level `let currentUser` variable is shared across all concurrent requests. Any `await` in `getEnrichedUser` yields control to the event loop, allowing another request to overwrite `currentUser` before the first request finishes.

**Fix:** Eliminate the shared mutable state. Each call to `getEnrichedUser` should use only local variables, never writing to module scope. The `getCurrentUser()` function, which relies on that shared state, must be redesigned -- it should no longer exist as a "read the global" function. Instead, the enriched user should be passed explicitly through the request context.

### Fixed Code

```javascript
// User service - fetches and enriches user profiles

async function fetchUserProfile(userId) {
  const response = await fetch(`/api/users/${userId}`);
  const user = await response.json();
  return user;
}

async function fetchUserPermissions(userId) {
  const response = await fetch(`/api/users/${userId}/permissions`);
  const permissions = await response.json();
  return permissions;
}

/**
 * Get a fully enriched user profile with permissions.
 * Called from the auth middleware on every request.
 *
 * Returns a new enriched user object each time -- no shared state.
 * The caller (auth middleware) should attach this to the request
 * context (e.g., req.user) rather than relying on module-level state.
 */
export async function getEnrichedUser(userId) {
  const user = await fetchUserProfile(userId);
  const permissions = await fetchUserPermissions(userId);
  user.permissions = permissions;
  return user;
}

/**
 * getCurrentUser() has been removed.
 *
 * The previous implementation relied on module-level mutable state
 * (`let currentUser`), which caused a race condition under concurrent
 * requests: one request's user would overwrite another's.
 *
 * Instead, the auth middleware should store the enriched user on the
 * request object (e.g., `req.user = await getEnrichedUser(userId)`),
 * and the logging middleware should read it from there
 * (e.g., `req.user`).
 */
```

### Key changes

1. **Removed `let currentUser = null`** -- the module-level shared variable that was the root cause.
2. **`getEnrichedUser` now uses only local variables** (`const user`). Each concurrent call gets its own stack frame with its own `user` binding. Interleaving is no longer a problem because no shared state is mutated.
3. **Removed `getCurrentUser()`** -- this function was fundamentally broken because it relied on the shared global. The logging middleware should instead read the user from the request context (e.g., `req.user`), which is per-request and immune to cross-contamination.

### Migration note for callers

The auth middleware should change from:

```javascript
// BEFORE (broken):
const user = await getEnrichedUser(userId);
// logging middleware later calls getCurrentUser()
```

To:

```javascript
// AFTER (fixed):
req.user = await getEnrichedUser(userId);
// logging middleware reads req.user instead of getCurrentUser()
```

This ensures each request carries its own user object through the entire request lifecycle, with no shared mutable state.
