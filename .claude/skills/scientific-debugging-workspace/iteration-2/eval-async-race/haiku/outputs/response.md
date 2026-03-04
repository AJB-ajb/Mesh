# Scientific Debugging: Async Race Condition in userService.js

## Problem Summary

Intermittent bug under concurrent load: when two users hit the API simultaneously, user A sometimes gets user B's permissions (or vice versa). Logging middleware also logs the wrong user occasionally. Null checks and try/catch didn't help because the data isn't missing or erroring — it's just wrong.

## Diagnosis

### Confusions That Point to Root Cause

1. **Why did null checks fail?** Because the user object IS there — it's just the wrong user. This isn't a missing-data problem; it's a **data contamination problem**.
2. **Why only under concurrent load?** Timing is the key. Single-user testing never triggers the race condition because there's no interleaving.
3. **Attempted fixes missed the real issue**: Null checks and error handling assume data is missing or invalid, not that it's from the wrong request.

### Root Cause Analysis

**The culprit: Global `currentUser` variable**

The code stores user state in a global variable:

```javascript
let currentUser = null;

async function getEnrichedUser(userId) {
  currentUser = await fetchUserProfile(userId); // Line 22
  const permissions = await fetchUserPermissions(userId);
  currentUser.permissions = permissions; // Line 24
  return currentUser;
}
```

**Race condition scenario:**

1. Request A calls `getEnrichedUser(userA)`
2. Request B calls `getEnrichedUser(userB)` before Request A completes
3. Request B's `fetchUserProfile(userB)` completes first
4. Line 22 executes for Request B: `currentUser = userB` (overwrites userA)
5. Request A's logging middleware calls `getCurrentUser()` → returns userB instead of userA
6. Both requests now share the same global reference; whoever's fetch completes last wins

### Hypothesis Evaluation

**H1: Race condition on global `currentUser` — CONFIRMED**

- ✓ Explains why only concurrent requests fail
- ✓ Explains why data is "wrong" not "missing"
- ✓ Explains why logging gets the wrong user
- ✓ Explains why null checks didn't help (the user object exists; it's just shared)

**H2: Async race within `getEnrichedUser` — REJECTED**

- The userId is passed in once and never changes
- Sequential awaits use the same userId parameter

**H3: Fetch response mixing — REJECTED**

- Each request has its own userId
- Responses are awaited sequentially

## The Fix

**Eliminate the global state.** Return the enriched user directly instead of storing it in `currentUser`. Each request should have its own isolated user data.

For the logging middleware's `getCurrentUser()` call, the user should be passed through request context (e.g., Express `req.user`, AsyncLocalStorage, or middleware parameters) instead of relying on global state.

### Key Changes

1. Remove the global `currentUser` variable
2. Return the enriched user directly from `getEnrichedUser()`
3. Pass user through request context (not via `getCurrentUser()`)
4. The logging middleware should receive the user as a parameter, not query a global

## Verification

After fixing, run concurrent load tests:

- 2+ simultaneous requests to different userIds
- Assert each request gets its own correct user data
- Assert logging shows correct user per request (no cross-contamination)

The fix prevents the race by eliminating shared mutable state entirely.
