---
name: write-tests
description: >
  Write tests that find bugs — not tests that re-specify the implementation. Enforces adversarial
  test thinking: tests approach code from a different angle than the implementation, target specific
  failure modes, and skip what TypeScript already catches. IMPORTANT: Trigger proactively after
  completing any feature implementation or bug fix that adds/modifies non-trivial logic — don't
  wait for the user to ask for tests. Also trigger when someone says 'write tests', 'add tests',
  'test this', 'review tests', 'audit tests', or 'improve tests'.
argument-hint: "[file/module path] [audit]"
---

# Write Tests

## Why this exists

The agent that writes code writes tests with the same mental model — if the code has a bug, the test has the same bug. The result: tests that re-specify the implementation, break on every refactor, and catch zero real bugs. This skill fixes the workflow.

## Core Principles

### 1. Separate the writer from the tester

The test writer must approach the code as a **critic trying to break it**, not an author confirming it works. Prefer delegating test-writing to a subagent with a fresh context:

```
Task tool:
  prompt: "Your job is to find bugs in [module] by writing tests. You are a
    critic, not an author. Read the public interface and the call sites that
    use this module. Think about what could go wrong — boundary conditions,
    invalid states, security violations, race conditions, off-by-ones,
    ordering dependencies. Write tests that would expose real bugs. Do NOT
    just mirror the implementation in test form. Skip code that doesn't
    warrant testing (data passthrough, framework wiring)."
  subagent_type: code
```

The subagent should receive:

- The **file paths** to test (not the implementation plan or rationale)
- The instruction to **find bugs**, not to "achieve coverage"
- Permission to **not write tests** for code that doesn't warrant them

If you must write tests in the same session: pause and shift mindset. Ask yourself — "If I were reviewing a stranger's code, what would I be suspicious of?"

### 2. The bug filter

Before each test, answer: **"What specific category of bug would this catch that TypeScript + lint wouldn't?"**

Worth testing:

- Algorithmic logic (scoring, sorting, filtering, date math)
- State machines and transitions
- Security boundaries (auth, permissions, input validation at system edges)
- Data transformations where shape changes non-trivially
- Ordering dependencies and race conditions
- Error recovery paths

Not worth testing:

- Data passthrough (hook fetches and returns)
- Framework behavior (SWR caching, React rendering, Supabase client chaining)
- Type-level contracts TypeScript already enforces
- Default/initial state ("starts loading", "returns empty array")

### 3. Orthogonality

Tests must approach code from a **different angle** than the implementation.

- Implementation builds step-by-step → test the end-to-end result
- Implementation switches on cases → test properties that span all cases
- Implementation uses specific values → test with boundaries and adversarial inputs

**Think in properties**, not examples:

- "Score is always in [0, 1] regardless of null dimensions"
- "A user can never access another user's draft postings"
- "Accepting a match is idempotent"

### 4. Mock economy

Every mock is a lie — it encodes your assumptions about the dependency, not the dependency's actual behavior. The more you mock, the less you test.

- **More mock setup than test logic** → the test is probably worthless. Either:
  - Extract the pure logic into a testable function and test that
  - Write an integration test with real (or near-real) dependencies
  - Don't test it — rely on e2e coverage
- **Mocking the system under test** (e.g., mocking Supabase chains to test a hook that wraps Supabase) → you're testing your mocks, not your code

### 5. Integration over isolation

One test exercising `create posting → generate embedding → discover via search` catches more bugs than 10 unit tests of individual functions.

Priority:

1. **E2E tests** for user-facing flows (Playwright)
2. **Integration tests** for multi-module logic (real or near-real dependencies)
3. **Unit tests** only for algorithmic / pure logic

## Method

### Writing tests for new/changed code

1. **Read the public interface** — signatures, return types, API shapes. Resist reading the implementation first.
2. **Read the call sites** — how does other code use this module? What assumptions do callers make?
3. **List what could go wrong** — boundaries, invalid states, security gaps, concurrency, error paths.
4. **Write tests targeting those failure modes.** Each test should have a clear "this catches bugs where \_\_\_" justification.
5. **Now read the implementation.** Look for hidden assumptions, non-obvious error paths, tricky conditionals. Add tests for anything suspicious.
6. **Verify tests have teeth.** Mentally mutate the code — change a `<` to `<=`, swap an `&&` for `||`, remove an early return. Would any test fail? If not, the tests are too weak.

### Auditing existing tests

For each test file:

1. **Bug filter** — would this test catch a bug TypeScript doesn't? If no → **delete**.
2. **Mock ratio** — is mock setup larger than the test logic? → likely **delete** or **rewrite** as integration test.
3. **Framework testing** — does it test SWR/React/Supabase client behavior? → **delete**.
4. **Duplication** — is the same thing tested in multiple files? (e.g., "returns 401" in every route) → **deduplicate** to one shared test.
5. **Teeth check** — would a real bug in the module cause this test to fail? If not → **delete** or **rewrite**.

Classify each test as **keep**, **rewrite** (valuable intent, bad execution), or **delete**. Often 5 narrow unit tests can be replaced by 1 integration test.

### Bug-driven test extension

1. **Identify the bug class** — not "this specific input was wrong" but "what category of mistake led to this?"
2. **Write a failing test** — must fail before the fix, pass after.
3. **Generalize** — test the violated _invariant_, not the specific case. The test should catch similar bugs, not just this one.

## Anti-patterns

Real examples from this codebase — don't write tests like these:

- "starts in loading state" — tests SWR's default, not your code
- "provides mutate function for revalidation" — tests that SWR returns what SWR returns
- 60 lines of chainable mock builders to test a 30-line hook — testing mock wiring
- "returns 401 when unauthenticated" copy-pasted across 20 route files — test once in the auth guard
- Identical test structure per enum value — test the property that spans them all
- "handles fetch error" with a mock rejection and `expect(error).toBeTruthy()` — tests SWR error handling
