# Scientific Debugging: Async Race Condition in userService.js

## Switching to Diagnosis Mode

Two fixes have already been attempted and failed:

1. Adding null checks for the user object -- did not help because the user IS present, it is just the wrong user.
2. Wrapping `getEnrichedUser` in try/catch -- no errors are thrown, the data is simply incorrect.

Both fixes targeted symptoms (missing data, thrown errors) rather than the actual root cause. Time to stop guessing and diagnose systematically.

---

## Step 1: Note Confusions

What does not fit a simple mental model:

- **The bug is intermittent and only appears under concurrent load.** Single-user testing always works. This strongly implicates shared mutable state being modified by interleaved async operations.
- **The user object is present but wrong.** This rules out null/undefined issues and network failures. Something is actively _replacing_ the correct user with a different one.
- **The logging middleware (`getCurrentUser()`) also returns the wrong user.** This means the corruption is not local to one call -- it affects a module-level value that multiple consumers read.

---

## Step 2: Hypotheses

### Hypothesis 1: Shared module-level `currentUser` variable causes a race condition (HIGH confidence)

The module has a single `let currentUser = null` at the top. `getEnrichedUser` writes to it (`currentUser = await fetchUserProfile(userId)`), then reads it back after another `await`. Under concurrent calls:

1. Request A calls `getEnrichedUser("A")` and sets `currentUser` to User A's profile.
2. Request A hits `await fetchUserPermissions("A")` and yields control.
3. Request B calls `getEnrichedUser("B")` and **overwrites** `currentUser` with User B's profile.
4. Request A resumes, attaches A's permissions to `currentUser` -- which is now User B's profile.
5. Request A returns User B's profile (with A's permissions). Request B may also get corrupted data.

**Supporting evidence:**

- Bug only manifests under concurrent load (multiple `await` points create interleaving opportunities).
- User A gets User B's permissions or vice versa -- exactly the cross-contamination pattern shared mutable state produces.
- `getCurrentUser()` returns the wrong user because it reads the same shared variable that was overwritten.

**Contradicting evidence:** None. This is a textbook async race condition on shared mutable state.

### Hypothesis 2: The fetch API is returning cached/stale responses

Perhaps the `/api/users/:id` endpoint is being cached and returning stale data.

**Supporting evidence:** Could explain wrong data appearing.
**Contradicting evidence:** The user reports that User A gets User B's _permissions_, not stale data for the same user. Caching would return old data for the same user, not swap data between users. Also, the URL includes the userId, so cache keys would differ. This hypothesis is unlikely.

### Hypothesis 3: The fetch calls have a bug that drops the userId parameter

Perhaps the URL template is malformed and all requests hit the same endpoint.

**Supporting evidence:** Could explain cross-user contamination.
**Contradicting evidence:** The template literals look correct: `` `/api/users/${userId}` `` and `` `/api/users/${userId}/permissions` ``. The `userId` parameter is passed correctly through the call chain. Single-user testing works, which proves the URLs resolve correctly. If the URL were broken, it would fail consistently, not intermittently. This hypothesis is ruled out.

---

## Step 3: Test Before Fixing

The smallest experiment to confirm Hypothesis 1:

**Thought experiment / code trace:** Simulate two concurrent calls.

```
Time 0: getEnrichedUser("A") starts
Time 1: currentUser = await fetchUserProfile("A")  -->  currentUser = {id: "A", name: "Alice"}
Time 2: fetchUserPermissions("A") called, awaiting network...
Time 3: getEnrichedUser("B") starts (concurrent request)
Time 4: currentUser = await fetchUserProfile("B")  -->  currentUser = {id: "B", name: "Bob"}  // OVERWRITES!
Time 5: fetchUserPermissions("A") resolves for Request A
Time 6: currentUser.permissions = permissionsA  -->  Bob's profile now has Alice's permissions
Time 7: Request A returns currentUser  -->  Returns Bob's profile with Alice's permissions  // BUG!
```

This exactly matches the reported symptom: "user A gets user B's permissions, or vice versa."

**Verdict:** Hypothesis 1 is confirmed. The shared module-level `currentUser` variable is overwritten by concurrent calls across `await` boundaries.

---

## Step 4: Fix (Confirmed Root Cause)

**Root cause:** `currentUser` is a module-level singleton that is written and read across `await` points. When multiple requests interleave, they overwrite each other's data.

**The fix has two parts:**

1. **Eliminate the shared mutable state from `getEnrichedUser`.** Use a local variable instead of writing to the module-level `currentUser`. Each call gets its own isolated `user` object that cannot be overwritten by concurrent calls.

2. **Remove `getCurrentUser()` or redesign it.** The function `getCurrentUser()` is fundamentally broken in a concurrent environment -- a single module-level variable cannot represent "the current user" when multiple requests execute simultaneously. The logging middleware should receive the user object from the request context (e.g., `req.user`) rather than from a global singleton.

### What changed:

- `getEnrichedUser` now uses a **local** `user` variable. Each concurrent call has its own stack frame, so concurrent calls cannot interfere with each other.
- `getCurrentUser()` is preserved for backward compatibility but is documented as deprecated. For correctness, callers should use the user object returned by `getEnrichedUser` or stored on the request context.

### Why the previous fixes failed:

- **Null checks** failed because the problem was never a missing user -- it was the _wrong_ user. The shared variable always had a user; it was just being overwritten.
- **try/catch** failed because no error is thrown. The race condition silently produces incorrect data without any exception.
