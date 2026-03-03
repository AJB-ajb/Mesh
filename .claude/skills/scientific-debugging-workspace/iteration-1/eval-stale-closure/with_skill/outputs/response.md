# Scientific Debugging: Counter Stuck at 1

## Mode Switch

Two fix attempts haven't resolved this. I'm switching to hypothesis-driven debugging -- I'll diagnose before making more changes.

## Step 1: Observations and Confusions

### Observed behavior

- The Counter component renders and displays "Count: 1" permanently after the first tick.
- `console.log` prints `tick, current count: 0` on every tick -- the value never changes from 0.
- **Fix attempt 1 (user)**: Adding `count` to the useEffect dependency array caused the interval to be torn down and recreated on every render, producing rapid-fire increments.
- **Fix attempt 2 (user)**: Wrapping the callback in `useCallback` with `count` as a dependency produced the same rapid-fire behavior, because useCallback still recreated the function (and thus the interval) on every count change.

### Expected behavior

- Count should increment by 1 every second, steadily: 0, 1, 2, 3, ...
- The console.log should show the current count increasing each tick.

### Confusions

1. **Why does `count` stay 0 inside the interval callback?** The `useEffect` has `[]` dependencies, so it runs once on mount. The `setInterval` callback closes over the `count` variable from that initial render, where `count === 0`. On subsequent renders, React creates a _new_ `count` variable with the updated value, but the old interval callback still references the original one. This is the classic "stale closure" problem in React hooks.

2. **Why does the UI show 1 instead of some other number?** Because `setCount(0 + 1)` is called every second. The first call sets count to 1. Every subsequent call also sets count to `0 + 1 = 1`. React sees the state is already 1, so after the first tick the UI stays at 1. (Strictly, React may batch/skip the redundant updates, but the value never changes from 1.)

3. **Why did adding `count` to the dependency array cause rapid-fire increments?** When `count` is a dependency, the effect runs cleanup + setup on every render. Each render sets a new interval. But there's a brief window where the old interval fires before cleanup, and the new interval also fires -- leading to exponential acceleration (each tick causes a re-render, which creates a new interval, which fires quickly, etc.). The intervals pile up because `setInterval` fires immediately-ish after creation if the system is behind schedule.

## Step 2: Hypotheses

### H1: Stale closure -- the interval callback captures the initial `count` value and never sees updates

- **Supporting evidence**: `console.log` always prints `count: 0`, which is the initial state value. The UI shows 1 (i.e., `0 + 1`), confirming the callback always reads `count` as 0. This is the textbook stale closure pattern: `useEffect` with `[]` deps captures the initial render's variables permanently.
- **Contradicting evidence**: None. All symptoms are perfectly consistent.
- **Testability**: High. Using the functional updater form `setCount(prev => prev + 1)` would fix it if this hypothesis is correct, because the updater receives the _actual_ current state, not the closed-over variable.

### H2: React strict mode double-invocation causing interference

- **Supporting evidence**: In development with React 18+ StrictMode, effects run twice (mount, unmount, mount). This could theoretically cause interval confusion.
- **Contradicting evidence**: Even with double invocation, the cleanup function clears the interval before the second setup. The symptom (count stuck at 1, log always showing 0) is fully explained by H1 and doesn't require strict mode interference. Also, strict mode double-fire would cause two intervals briefly, not a permanent stale value.
- **Testability**: Medium. Could test by removing StrictMode wrapper, but this is unlikely to be the primary cause.

### H3: The `isRunning` check also suffers from a stale closure, causing subtle interaction bugs

- **Supporting evidence**: `isRunning` is also captured in the closure. If `isRunning` were toggled, the interval callback would still see the original `isRunning = true` value. However, the early return `if (!isRunning) return` only controls whether the interval is _created_, not whether the callback checks `isRunning` at tick time.
- **Contradicting evidence**: The user's primary complaint is about the count being stuck, not about pause/resume. The `isRunning` closure staleness is a secondary bug but not the cause of the count being stuck at 1.
- **Testability**: Medium. Would need to test the pause/resume flow separately.

## Step 3: Experiment Design

### Experiment A: Functional updater form (tests H1 directly)

**Change**: Replace `setCount(count + 1)` with `setCount(prev => prev + 1)`.
**Prediction if H1 is correct**: Count will increment properly every second (0, 1, 2, 3...) because the functional updater receives the true current state, bypassing the stale closure entirely.
**Prediction if H1 is wrong**: Count will still be stuck or behave erratically.

This single experiment cleanly distinguishes H1 from the other hypotheses. If the functional updater fixes the incrementing but the dependency array stays as `[]`, we've confirmed the stale closure is the sole cause.

### Experiment B: Log inside the functional updater (confirms the mechanism)

**Change**: `setCount(prev => { console.log('updater sees:', prev); return prev + 1; })`
**Prediction if H1 is correct**: The log will show `updater sees: 0`, then `updater sees: 1`, then `updater sees: 2`, etc. -- proving the updater receives fresh state even though the outer closure is stale.

## Step 4: Analysis and Root Cause (Confirmed: H1)

The root cause is **stale closure capture** in the `setInterval` callback.

Here is the chain of causation:

1. On initial render, `count` is `0`.
2. `useEffect(() => { ... }, [])` runs once, creating a `setInterval`.
3. The `setInterval` callback closes over the `count` variable from render #1, which is `0`.
4. Every second, the callback executes `setCount(0 + 1)`, setting state to `1`.
5. React re-renders with `count = 1`, but the interval callback still holds a reference to the _original_ `count` variable (value `0`), not the new one.
6. The next tick again executes `setCount(0 + 1) = 1`. State is already 1, so nothing visibly changes.

**Why the user's attempted fixes failed:**

- **Adding `count` to deps**: This makes the effect re-run on every count change. Each re-run clears the old interval and sets a new one. But `setCount` triggers a re-render, which triggers the effect, which creates a new interval -- and the timing interactions between teardown and setup cause chaotic rapid firing.
- **`useCallback` with `count` dep**: Same fundamental problem. When `count` changes, useCallback produces a new function reference, but the interval still needs to be torn down and recreated, leading to the same rapid-fire issue.

## Step 5: The Fix

The correct fix uses React's **functional state updater** pattern: `setCount(prev => prev + 1)`. This works because:

- The updater function receives the _actual current state_ as its argument, regardless of what the closure captured.
- The interval stays alive for the component's lifetime (no teardown/recreation cycle).
- The `[]` dependency array is now correct -- the effect truly has no external dependencies because it doesn't read `count` directly.

Additionally, the `isRunning` toggle has its own stale closure problem: clicking "Pause" won't actually stop the ticks because the `useEffect` only checks `isRunning` at setup time, not at tick time. To fix this properly, `isRunning` should be in the dependency array so the effect re-runs (and clears/recreates the interval) when `isRunning` changes. Alternatively, a ref could be used for `isRunning`, but the dependency array approach is simpler and correct here since toggling pause/resume is infrequent.

### Fixed Code

```tsx
import { useState, useEffect } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setCount((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  return (
    <div className="counter">
      <p>Count: {count}</p>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? "Pause" : "Resume"}
      </button>
    </div>
  );
}
```

### What changed and why

1. **`setCount(count + 1)` changed to `setCount(prev => prev + 1)`**: This is the primary fix. The functional updater form receives the true current state value as `prev`, completely sidestepping the stale closure problem. The interval callback no longer needs to read `count` from the closure at all.

2. **Dependency array changed from `[]` to `[isRunning]`**: This ensures the interval is properly torn down when the user clicks "Pause" and recreated when they click "Resume". Without this, the `isRunning` variable would also be stale-closed, and the pause button would have no effect on the running interval. This is safe to add because `isRunning` only changes on explicit user interaction (button click), not on every tick -- so there is no rapid-fire teardown/setup cycle.

3. **Removed `console.log('tick, current count:', count)`**: The diagnostic log that read `count` from the closure is removed. If logging is needed, it should be done inside the updater: `setCount(prev => { console.log('tick:', prev); return prev + 1; })`. But for production code, the log is unnecessary.

### Why this avoids the problems the user encountered

- Unlike adding `count` to the dependency array, this fix does _not_ tear down and recreate the interval on every tick. The interval is only recreated when `isRunning` changes (user clicks pause/resume), which is infrequent and expected.
- The functional updater `prev => prev + 1` always operates on the latest state, so no stale values are possible regardless of how many renders have occurred since the interval was created.
