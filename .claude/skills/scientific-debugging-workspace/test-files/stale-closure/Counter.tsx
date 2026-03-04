import { useState, useEffect } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      console.log("tick, current count:", count);
      setCount(count + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="counter">
      <p>Count: {count}</p>
      <button onClick={() => setIsRunning(!isRunning)}>
        {isRunning ? "Pause" : "Resume"}
      </button>
    </div>
  );
}
