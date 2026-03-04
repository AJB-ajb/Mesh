# Debugging: Counter Stuck at 1 (Stale Closure)

Switching to diagnosis mode. Two fixes have already failed, so rather than reaching for another change, I want to build a correct mental model first.

---

## Step 1: Note the Confusions

The symptoms don't fit a naive reading of the code:

- **Confusion A**: `setCount(count + 1)` should increment the count, yet `count` stays at 0 forever in the log. If the effect ran once with `count = 0`, the first tick should produce `count = 1` — but subsequent ticks keep saying "current count: 0". That means the callback is not reading the updated state.

- **Confusion B**: Adding `count` to the dependency array (Fix 1) or wrapping the callback in `useCallback` with `count` as a dependency (Fix 2) both caused "rapid-fire" increments rather than one-per-second. That's counterintuitive if the fix was "just re-register the interval". It suggests the interval is being _created and never fully cleared_, stacking up.

- **Confusion C**: The `isRunning` state is referenced inside the effect but is **not** in the dependency array either. This is a second stale closure that the user hasn't noticed yet, but it's relevant to the fix shape.

---

## Step 2: Hypotheses

### H1 — Stale closure capturing `count = 0` forever

The effect runs once (empty `[]` deps) and closes over the initial `count = 0`. Every tick calls `setCount(0 + 1)`, setting state to `1`. React sees `1 === 1` (same value) and bails out of re-render, so count never advances past 1.

**Supporting evidence**: The log shows "current count: 0" on every tick — exactly what a stale closure over the initial value would produce. The counter displays 1 because `setCount(0 + 1)` runs successfully once (or repeatedly sets it to 1).

**Contradicting evidence**: None.

**Testability**: High. If we change `setCount(count + 1)` to the functional updater form `setCount(c => c + 1)`, the closure no longer needs to read `count` at all, so staleness is irrelevant. If this fixes it, H1 is confirmed.

---

### H2 — Interval cleanup not executing before a new one is registered

When `count` was added to deps (Fix 1), the effect re-runs on every render. If the cleanup (`clearInterval`) runs _after_ the new `setInterval` is already started in the same render cycle, you could momentarily have two intervals.

**Supporting evidence**: The "jumps by huge amounts" symptom is consistent with multiple concurrent intervals all firing.

**Contradicting evidence**: React guarantees cleanup runs before the next effect. However, the _first_ tick from the old interval can fire in the gap between the new render and the cleanup, and this compounds: each re-render triggered by a state update spawns a new interval before tearing down the old one, causing exponential stacking.

**Testability**: Medium. This is actually a _consequence_ of H1's flawed fix, not an independent root cause. Fixing H1 correctly eliminates this entirely.

---

### H3 — `isRunning` stale closure causing interval to run even when paused

The `isRunning` check is inside the effect but `isRunning` is not in the deps array. If the user pauses, the interval continues ticking because the callback still sees the initial `isRunning = true`.

**Supporting evidence**: Same stale closure pattern as H1.

**Contradicting evidence**: The user hasn't reported the pause button failing, so this may not be the immediate symptom — but it's a latent bug in the same code.

**Testability**: High. Test by clicking Pause; if the interval keeps running, H3 is confirmed.

---

## Step 3: Diagnostic Test

The key experiment is: **change only `setCount(count + 1)` to `setCount(c => c + 1)` and observe**.

- If the count increments correctly (1, 2, 3 ...) and the log no longer shows "current count: 0" every time → **H1 confirmed**: the sole root cause is stale closure over `count`.
- If the count still sticks → something else is wrong with the effect lifecycle.

This is the minimal code change that tests H1 without touching the dependency array (which is what caused H2).

The functional updater form `setCount(c => c + 1)` works because React passes the _current_ state as the argument `c` at the moment the updater runs, bypassing the closure entirely. The callback never needs to read `count` from the outer scope.

---

## Step 4: Root Cause Confirmed and Fix Applied

**H1 is the root cause.**

The effect runs exactly once (empty deps). Its callback closes over `count = 0`. Every call to `setCount(0 + 1)` sets state to `1`. React performs a shallow equality check: `1 === 1`, so no re-render occurs after the first tick. The component stays frozen at 1.

**Why the attempted fixes failed:**

- _Fix 1 (add `count` to deps)_: This causes the effect to re-run on every render. Each re-run creates a new `setInterval`. React cleans up the previous interval, but because the state update from the tick triggers the re-run, you end up with intervals stacking (each new interval fires before the next cleanup), causing rapid-fire increments.
- _Fix 2 (useCallback with `count` dep)_: `useCallback` memoizes the function reference, but when `count` is a dependency, a new function is created on every render — which means the effect still re-runs and re-registers the interval on every state change. Same rapid-fire result.

**The correct fix** uses the functional updater form and restructures the `isRunning` logic so the effect re-runs only when `isRunning` changes (not on every count change):

```tsx
useEffect(() => {
  if (!isRunning) return;

  const interval = setInterval(() => {
    setCount((c) => c + 1); // functional updater: no stale closure
  }, 1000);

  return () => clearInterval(interval);
}, [isRunning]); // only re-run when isRunning changes
```

Key changes:

1. `setCount(c => c + 1)` — uses the functional updater so the callback never reads `count` from scope. No stale closure.
2. `[isRunning]` in the dependency array — the effect only re-runs when the user pauses/resumes. This also fixes the latent H3 bug: when `isRunning` becomes `false`, the effect re-runs, hits the early return, and clears the interval correctly.

The interval is now created once per start/stop cycle, not once per count tick, so there is no stacking.
