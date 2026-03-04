# Debugging Analysis: Intermittent User Cross-Contamination in userService.js

## 1. Observed Symptoms

- Under concurrent load, user A sometimes receives user B's permissions (or vice versa).
- `getCurrentUser()` in logging middleware returns the wrong user.
- The bug never appears in single-user testing.
- Null checks do not help -- the user object is present, just incorrect.
- Try/catch reveals no errors -- the data returned is structurally valid but belongs to the wrong user.

## 2. Root Cause: Shared Mutable Module-Level State + Async Interleaving

The bug is a **classic async race condition** caused by the module-level variable `currentUser` being shared across all concurrent callers.

Here is the problematic code:

```js
let currentUser = null; // <-- single shared slot for ALL requests

export async function getEnrichedUser(userId) {
  currentUser = await fetchUserProfile(userId); // STEP 1: write to shared state
  const permissions = await fetchUserPermissions(userId); // STEP 2: await (yields control)
  currentUser.permissions = permissions; // STEP 3: mutate shared state
  return currentUser; // STEP 4: return shared state
}
```

### How the interleaving causes the bug

Consider two concurrent requests, for user A and user B:

| Time | Request A                                                             | Request B                                         | `currentUser` value                    |
| ---- | --------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| t1   | `currentUser = await fetchUserProfile("A")`                           |                                                   | User A                                 |
| t2   | `await fetchUserPermissions("A")` starts...                           |                                                   | User A                                 |
| t3   | _(awaiting network)_                                                  | `currentUser = await fetchUserProfile("B")`       | **User B**                             |
| t4   | _(awaiting network)_                                                  | `await fetchUserPermissions("B")` starts...       | User B                                 |
| t5   | ...`fetchUserPermissions("A")` resolves                               |                                                   | User B                                 |
| t6   | `currentUser.permissions = permissionsA`                              |                                                   | User B (with A's perms!)               |
| t7   | `return currentUser` --> **returns User B with User A's permissions** |                                                   |                                        |
| t8   |                                                                       | ...`fetchUserPermissions("B")` resolves           | User B (with A's perms)                |
| t9   |                                                                       | `currentUser.permissions = permissionsB`          | User B (with B's perms -- overwritten) |
| t10  |                                                                       | `return currentUser` --> returns User B correctly |                                        |

**Result at t7:** Request A's caller receives User B's profile object, with User A's permissions attached to it. This is exactly the symptom described.

There are actually **two distinct bugs** here:

### Bug 1: `getEnrichedUser` returns wrong data to its caller

Between the two `await` points (lines 22 and 23), another call to `getEnrichedUser` can overwrite `currentUser`. When the first call resumes, it attaches permissions to the _wrong_ user object and returns that wrong object.

### Bug 2: `getCurrentUser()` returns stale/wrong data

`getCurrentUser()` simply returns whatever `currentUser` points to at the moment it is called. Since every request overwrites this single variable, the logging middleware will always get whichever user was most recently written -- not the user associated with the current request.

## 3. Why the User's Attempted Fixes Failed

- **Null checks**: The variable is never null during concurrent use; it is always populated, just with the wrong user's data. Null checks are irrelevant.
- **Try/catch around getEnrichedUser**: No error is thrown. The fetches succeed and return valid data. The corruption happens through interleaving of correct operations on shared mutable state, not through exceptions.

## 4. The Fix

The fix has two parts:

### Part A: Eliminate shared mutable state from `getEnrichedUser`

Use a **local variable** instead of the module-level `currentUser` inside `getEnrichedUser`. Each invocation gets its own local `user` object that cannot be overwritten by concurrent calls. This is the core fix for the race condition.

### Part B: Replace `getCurrentUser()` with a request-scoped mechanism

The `getCurrentUser()` function is fundamentally broken under concurrency because it relies on the same shared module-level variable. A single global variable cannot hold per-request state when multiple requests are in flight.

The idiomatic fix in Node.js server environments is to either:

1. Pass the user object through the request context (e.g., `req.user`), or
2. Use `AsyncLocalStorage` to maintain request-scoped state without explicit parameter passing.

The simplest and most common approach is option (1): have `getEnrichedUser` return the user, have the auth middleware attach it to `req.user`, and have the logging middleware read from `req.user`. This eliminates the need for a global `getCurrentUser()` entirely.

However, since the logging middleware currently calls `getCurrentUser()` (suggesting it may not have direct access to `req`), I provide a solution using `AsyncLocalStorage` that preserves the `getCurrentUser()` API while making it request-safe.

### Fixed Code

```js
// User service - fetches and enriches user profiles

import { AsyncLocalStorage } from "node:async_hooks";

const requestStorage = new AsyncLocalStorage();

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
 */
export async function getEnrichedUser(userId) {
  const user = await fetchUserProfile(userId);
  const permissions = await fetchUserPermissions(userId);
  user.permissions = permissions;

  // Store in request-scoped context so getCurrentUser() is safe
  const store = requestStorage.getStore();
  if (store) {
    store.currentUser = user;
  }

  return user;
}

/**
 * Quick access to the current request's user (used by logging middleware).
 * Returns the user for the current async context, not a global singleton.
 */
export function getCurrentUser() {
  const store = requestStorage.getStore();
  return store ? store.currentUser : null;
}

/**
 * Wraps a request handler so that getEnrichedUser/getCurrentUser are
 * scoped to that request's async context.
 *
 * Usage in middleware:
 *   import { withRequestScope } from './userService.js';
 *   app.use((req, res, next) => withRequestScope(() => next()));
 */
export function withRequestScope(fn) {
  return requestStorage.run({ currentUser: null }, fn);
}
```

## 5. Summary of Changes

| Line/Area                     | Before (buggy)                                    | After (fixed)                                                        | Why                                                         |
| ----------------------------- | ------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------- |
| Module-level `currentUser`    | Shared mutable global                             | Removed entirely                                                     | Eliminates the shared state that caused cross-contamination |
| `getEnrichedUser` body        | Writes to `currentUser` global between two awaits | Uses local `user` variable; optionally stores in `AsyncLocalStorage` | Local variable cannot be overwritten by concurrent calls    |
| `getCurrentUser()`            | Returns the single global `currentUser`           | Reads from `AsyncLocalStorage` (request-scoped)                      | Each request's async context has its own isolated user      |
| New export `withRequestScope` | N/A                                               | Wraps request handlers in `AsyncLocalStorage.run()`                  | Provides the per-request isolation boundary                 |

## 6. Key Takeaway

**Never store per-request state in module-level variables in concurrent server environments.** Even though Node.js is single-threaded, `await` points yield control back to the event loop, allowing other requests to interleave and corrupt shared mutable state. Use request-scoped storage (request objects, `AsyncLocalStorage`, or similar) instead.
