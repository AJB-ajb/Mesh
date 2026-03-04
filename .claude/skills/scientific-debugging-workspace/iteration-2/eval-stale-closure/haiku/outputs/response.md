# Scientific Debugging: Stale Closure in Counter

## Root Cause Analysis

Your component has a **classic stale closure bug**, and your two attempted fixes both created a worse problem. Here's what's happening:

### The Bug (Original Code)

With an empty dependency array `[]`, the `setInterval` callback captures `count = 0` at mount and never releases it:

```
Mount: count = 0 captured in closure
Tick 1: setCount(0 + 1) → count becomes 1
Tick 2: setCount(0 + 1) → count stays 1  ← closure still has 0!
Tick 3: setCount(0 + 1) → count stays 1
...
```

The console.log always shows `0` because it's reading the stale `count` from the closure.

### Why Your Fixes Failed

**Fix 1 (adding `count` to deps)**: `useEffect(() => {...}, [count])`

- Effect re-runs on every count change
- This recreates the interval on each render
- Now you have multiple intervals firing simultaneously
- Result: rapid-fire increments ("count jumps by huge amounts")

**Fix 2 (useCallback with `count` dep)**: Same problem—if the callback depends on `count`, the effect still re-runs on every count change, recreating the interval repeatedly.

## The Correct Solution

Replace `setCount(count + 1)` with the **functional setState form** `setCount(prev => prev + 1)`. This doesn't read `count` from closure—it receives the previous state directly from React, always current:

```tsx
setCount((prev) => prev + 1); // prev is always the latest state
```

The dependency array should be `[isRunning]` because you want to recreate the interval only when the pause/resume button is clicked, not on every count change.

### Fixed Code

```tsx
import { useState, useEffect } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      console.log("tick, current count:", count);
      setCount((prev) => prev + 1); // ← Use functional setState
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]); // ← Depend only on isRunning, not count

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

## Why This Works

1. **No closure capture of `count`**: The functional setState `prev => prev + 1` receives the latest state value from React's internal state, not from the closure.
2. **Single interval**: The effect only re-runs when `isRunning` changes (pause/resume), so the interval is created once and reused for the entire session.
3. **Correct incrementing**: Each tick increments by 1, from whatever the true current count is.

## Key Takeaway

Whenever you need state in an effect callback that doesn't appear in the dependency array, use functional setState instead of capturing it from closure. This is the standard React pattern for this exact scenario.
