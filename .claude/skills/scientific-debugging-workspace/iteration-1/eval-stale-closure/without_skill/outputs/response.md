# Debugging Analysis: Counter Component Stuck at 1

## Observed Behavior

- The counter displays "Count: 1" and never increments further.
- The console prints `tick, current count: 0` on every tick -- the value never changes.
- Adding `count` to the dependency array causes the interval to be torn down and recreated on every render, producing erratic rapid-fire increments.
- Wrapping the callback in `useCallback` with `count` as a dependency has the same problem (new callback -> new effect -> new interval every render).

## Root Cause: Stale Closure

The bug is a **stale closure** -- one of the most common React Hooks pitfalls.

Here is the problematic code:

```tsx
useEffect(() => {
  if (!isRunning) return;

  const interval = setInterval(() => {
    console.log("tick, current count:", count);
    setCount(count + 1); // <-- captures `count` from the initial render
  }, 1000);

  return () => clearInterval(interval);
}, []); // <-- empty dependency array
```

### What happens step-by-step

1. **Mount (render 0):** `count` is `0`. The effect runs and creates a `setInterval`. The interval callback **closes over** the variable `count`, whose value at this moment is `0`. Because the dependency array is `[]`, React will never re-run this effect.

2. **First tick (1 s):** The callback executes `setCount(0 + 1)`. React re-renders with `count = 1`. However, the interval callback still holds a reference to the **original** closure where `count === 0`. The old closure is never replaced because the effect never re-runs.

3. **Second tick (2 s):** The same stale callback runs again. It still sees `count === 0`, so it calls `setCount(0 + 1)` again. React sees that the new state (`1`) equals the current state (`1`), so it either bails out or re-renders with the same value. The counter is stuck.

This is why the console always prints `current count: 0` -- the closure permanently captured the value of `count` from render 0.

### Why adding `count` to deps doesn't work cleanly

```tsx
useEffect(() => {
  const interval = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(interval);
}, [count]); // re-runs on every count change
```

Every time `count` changes, React:

1. Runs the cleanup (clears the old interval).
2. Runs the effect again (creates a new interval).

This means you get a brand-new 1-second timer on **every** render. If the render cycle is faster than 1 second (which it is), you end up with overlapping intervals before cleanup catches up, or the timer resets its 1-second countdown every render, leading to unpredictable behavior. In practice the count jumps erratically.

## The Fix: Use the Functional Updater Form of `setState`

React's `setState` accepts a **callback** (often called the "functional updater") that receives the **current** state as its argument. This completely sidesteps the closure problem because the callback doesn't need to read `count` from the surrounding scope at all.

```tsx
setCount((prev) => prev + 1);
```

With this change, the dependency array can remain `[]` (well, it should include `isRunning` to react to pause/resume) and the interval callback never goes stale -- it always asks React for the latest value via `prev`.

### Secondary Bug: `isRunning` is also captured by the stale closure

The original code also reads `isRunning` inside the effect but omits it from the dependency array. This means clicking "Pause" sets `isRunning` to `false` in state, but the already-running effect never re-evaluates the `if (!isRunning) return` guard -- the interval keeps ticking.

The fix is to include `isRunning` in the dependency array so the effect re-runs (and either sets up or skips the interval) whenever the user toggles pause/resume.

## Fixed Code

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

### Changes made

| Line | Before                | After                        | Why                                                                                                                                                    |
| ---- | --------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 12   | `setCount(count + 1)` | `setCount(prev => prev + 1)` | Uses the functional updater to always read the latest state, avoiding the stale closure.                                                               |
| 11   | `console.log(...)`    | _(removed)_                  | The debug log read the stale `count`; it is no longer needed. If logging is desired, it can be done in a separate `useEffect` that depends on `count`. |
| 16   | `}, [])`              | `}, [isRunning])`            | Re-runs the effect when `isRunning` changes so that pause/resume actually works.                                                                       |

### Why this works

- **`setCount(prev => prev + 1)`** -- The interval callback no longer closes over `count`. Instead it passes a function to `setCount` that receives the real current value from React's internal state. No matter how old the closure is, the update is always correct.
- **`[isRunning]` dependency** -- When the user clicks Pause, `isRunning` becomes `false`, the effect re-runs, hits the early return, and no interval is created. When they click Resume, `isRunning` becomes `true`, the effect re-runs, and a fresh interval starts. The count picks up exactly where it left off because state is preserved across effect re-runs.

## General Rule

Whenever a `setInterval` or `setTimeout` callback needs to update state based on the previous state, always use the functional updater form (`setState(prev => ...)`) rather than reading the state variable directly. This avoids stale closures entirely without needing to churn the interval via the dependency array.
