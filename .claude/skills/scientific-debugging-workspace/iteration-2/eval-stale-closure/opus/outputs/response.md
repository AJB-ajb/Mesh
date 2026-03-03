# Scientific Debugging: Counter Stuck at 1

Two fix attempts have already failed, so I am switching to diagnosis mode rather than applying another speculative fix.

## 1. Confusions

- The console log prints `count: 0` on every tick, even though `setCount(count + 1)` is called. This means the `count` variable inside the callback never changes -- it is always the value captured when the closure was created.
- Adding `count` to the dependency array "fixes" the stale read, but causes a new interval to be created on every render, producing runaway ticks that pile up before the previous interval is cleared.
- Wrapping the callback in `useCallback` with `count` as a dependency has the same problem: the callback identity changes on every render, but `setInterval` still holds a reference to the old callback, so you must still tear down and recreate the interval -- same runaway behavior.

The core confusion is: **how do you read fresh state inside a long-lived closure (`setInterval`) without recreating that closure on every state change?**

## 2. Hypotheses

| #   | Hypothesis                                                                                                                                                                                                                       | Evidence for                                                       | Evidence against                                                           | Testable?                                                                                      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| H1  | **Stale closure over `count`.** The `[]` dependency array means the effect runs once. The `setInterval` callback closes over the initial `count` (0) and never sees updates. `setCount(0 + 1)` sets state to 1 every tick.       | Console prints `count: 0` every tick. Displayed value sticks at 1. | --                                                                         | Yes -- use functional updater `setCount(c => c + 1)` and the log would show increasing values. |
| H2  | **Interval is being cleared and recreated too often.** (What happened with the user's first attempted fix.) Adding `count` to deps causes the effect cleanup + setup to fire every render, creating brief overlapping intervals. | User reports "count jumps by huge amounts."                        | This only happens with `[count]` deps, not with `[]`. Not the current bug. | Yes -- add a log in the cleanup function.                                                      |
| H3  | **React StrictMode double-invocation.** In development, StrictMode runs effects twice, which could create two intervals.                                                                                                         | Would cause count to increment by 2 per second, not stick at 1.    | The observed behavior is "stuck at 1", not "incrementing by 2".            | Yes -- remove StrictMode wrapper and observe.                                                  |

**H1 is the strongest candidate.** H2 explains the failed fix, not the original bug. H3 would produce a different symptom.

## 3. Diagnostic Test

The cheapest test that distinguishes H1 from the others: change `setCount(count + 1)` to `setCount(c => c + 1)` (the functional updater form) **without changing anything else** (keep `[]` deps, keep the `console.log`).

- **If H1 is correct:** the displayed count will increment correctly every second. The `console.log` will still print `0` every tick (the closure is still stale), but `setCount` will receive the true current value via the `c` parameter.
- **If H1 is wrong:** the count will still stick at 1.

This is a one-character-level change that gives a binary answer.

## 4. Root Cause (Confirmed: H1)

The root cause is a **stale closure**. Here is the mechanism step by step:

1. On mount, `useEffect` runs with `count = 0` (the initial state).
2. `setInterval` captures a callback. That callback closes over `count`, which is the **local const** from that particular render. Its value is `0` and will never change -- JavaScript closures capture variable bindings, and `const count` is a new binding per render, but this callback only ever sees the first one.
3. Every second, the callback runs `setCount(0 + 1)`, setting state to `1`.
4. React re-renders with `count = 1`, but the interval callback still references the original `count = 0` binding. So on the next tick it again calls `setCount(0 + 1) = 1`. The state is already `1`, so the display appears stuck.

### Why the user's attempted fixes failed

- **Adding `count` to deps `[count]`:** The effect tears down the old interval and creates a new one on every render. Because React batching and timing interact, you get overlapping intervals and rapid-fire increments.
- **`useCallback` with `[count]`:** Same fundamental issue. `useCallback` gives you a new function reference when `count` changes, but `setInterval` was already called with the old reference. You would still need to clear and recreate the interval, which is the same as adding `count` to the `useEffect` deps.

## 5. Fix

Use the **functional updater** form of `setCount`. Instead of `setCount(count + 1)` (which reads from the stale closure), write `setCount(prev => prev + 1)` (which receives the current state from React regardless of closure scope).

This avoids the need to add `count` to the dependency array, so the interval is created once and never torn down/recreated.

### Secondary bug: the Pause button

There is also a latent bug with `isRunning`. The same stale closure problem applies: `isRunning` is captured at mount time as `true`. Clicking Pause re-renders with `isRunning = false`, but the existing interval callback never sees the new value. The `if (!isRunning) return;` guard at the top of the effect body only runs at effect setup time, not inside each tick.

To fix pause/resume properly, `isRunning` must be in the dependency array so the effect re-runs when it changes, and the functional updater keeps `count` correct without needing it in the deps.

### Fixed code

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

**Changes made:**

1. `setCount(count + 1)` changed to `setCount(prev => prev + 1)` -- eliminates the stale closure over `count`.
2. Removed `console.log` that was only useful for debugging.
3. Added `[isRunning]` to the dependency array -- the effect re-runs when pause/resume toggles, correctly starting or stopping the interval.
