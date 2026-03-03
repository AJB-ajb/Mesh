# Scientific Debugging: async-race in userService.js

## Switching to Diagnosis Mode

Two fix attempts have already failed (null checks, try/catch). Rather than applying another patch, I am stopping code edits and running through the scientific debugging method first.

---

## Step 1 — Confusions

Things that do not fit a naive mental model of the bug:

- **Null checks did not help.** The user object is present — it is just the wrong one. This rules out "the fetch failed" as the root cause and also rules out "the variable is uninitialized." Something is assigning a real, valid user object to the wrong caller.
- **Try/catch found nothing.** No exceptions are thrown. The code reaches the return statement successfully, but returns stale or mismatched data. This rules out network errors and rejected promises.
- **It only happens under concurrent load.** Single-user tests always pass. That is the strongest signal: the bug is not in any single execution path but in the _interaction_ between two concurrent execution paths.

These three confusions together point at one place: the module-level `currentUser` variable being written and read by overlapping async calls.

---

## Step 2 — Hypotheses

### H1 (Primary): Shared mutable module-level state race condition

`currentUser` is a module singleton. When two requests arrive concurrently:

1. Request A calls `getEnrichedUser(userA)` → assigns `currentUser = userA`
2. Request B calls `getEnrichedUser(userB)` → assigns `currentUser = userB` (overwrites!)
3. Request A resumes after `await fetchUserPermissions(userA)` → writes `currentUser.permissions = permissionsA` — but `currentUser` now points at userB's object
4. Request A returns `currentUser`, which is userB's object now decorated with userA's permissions (or vice versa)

**Supporting evidence:** Only reproduces under concurrency. The user IS present (a real object is there). No errors thrown. The two failed fixes (null check, try/catch) address symptoms unrelated to this mechanism.

**Contradicting evidence:** None. This hypothesis explains every observed symptom.

**Testability:** Very high — can be confirmed by adding a log line immediately before and after the `await fetchUserPermissions` call to print the userId stored in `currentUser`.

---

### H2 (Secondary): The logging middleware reads currentUser between the two awaits

`getCurrentUser()` is called by logging middleware. Under H2, the middleware reads `currentUser` after `currentUser = await fetchUserProfile(userId)` but before `currentUser.permissions = permissions`, capturing a partially constructed user. This is a subset of H1 — it is the same root cause (shared mutable state) manifesting in the logger rather than in the return value.

**Supporting evidence:** Consistent with the symptom "logging middleware logs the wrong user."

**Contradicting evidence:** None; this is really H1 as seen from the logger's perspective.

**Testability:** High — same diagnostic logging as H1 would expose it.

---

### H3 (Unlikely): Event loop starvation / microtask ordering

A more exotic hypothesis: the Node.js event loop processes microtasks in an order that interleaves the two async chains non-deterministically. Under this hypothesis the bug would exist even without the shared variable — the awaited promises themselves would resolve in the wrong order.

**Supporting evidence:** Concurrency-only reproduction.

**Contradicting evidence:** The `fetch` calls are entirely independent per userId (different URLs). There is no shared promise or shared queue between the two requests. The awaited resources do not interfere. The module-level variable is the only shared state.

**Testability:** Could be ruled out by making `currentUser` local and checking if the bug disappears — but H1 already fully explains the behaviour without needing this.

---

## Step 3 — Smallest Distinguishing Experiment

**If H1 is correct**, adding these two log lines will reveal the overwrite:

```js
export async function getEnrichedUser(userId) {
  currentUser = await fetchUserProfile(userId);
  // Diagnostic: what userId is in currentUser now?
  console.log(
    "[diag] after profile fetch, currentUser.id =",
    currentUser.id,
    "expected:",
    userId,
  );
  const permissions = await fetchUserPermissions(userId);
  // Diagnostic: has currentUser changed under us?
  console.log(
    "[diag] after perms fetch,  currentUser.id =",
    currentUser.id,
    "expected:",
    userId,
  );
  currentUser.permissions = permissions;
  return currentUser;
}
```

Under concurrent load with userA and userB, the logs will show `currentUser.id` switching from userA to userB between the two log lines for one of the requests. That is a binary, unambiguous confirmation of H1.

You would NOT see this in single-user testing — the two log lines would always show the same userId.

---

## Step 4 — Confirmed Hypothesis and Fix

The evidence fully supports **H1**. The root cause is:

> `currentUser` is module-level mutable state. Multiple concurrent calls to `getEnrichedUser` all write to the same variable. The `await` suspension points between the two fetches create windows where a second request can overwrite `currentUser` while the first request is still using it.

### Why the two previous fixes failed

| Fix attempted                    | Why it failed                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| Null checks on the user object   | The object is never null — it is a real user. The problem is _which_ user.                |
| try/catch around getEnrichedUser | No exception is thrown. The code succeeds; it just operates on the wrong shared variable. |

### Targeted fix

Remove the shared mutable variable entirely. Each call to `getEnrichedUser` should keep its result in a local variable scoped to that invocation. `getCurrentUser()` must also change — it cannot rely on a shared singleton when requests are concurrent.

**Architectural note on `getCurrentUser()`:** A module-level "last user" accessor is fundamentally unsafe under concurrency. The correct pattern is to pass the user through the call stack (e.g. attached to the request object in Express middleware) rather than storing it globally. The fixed code below removes the global and returns the user directly; callers that need the user for logging should receive it as a parameter or from the request context.

See the fixed file at `userService.js` alongside this document.
