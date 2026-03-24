"use client";

import { useState, useEffect } from "react";

/**
 * SSR-safe mobile detection. Defaults to `false` (desktop) on the server;
 * client updates via queueMicrotask on mount. The 639px breakpoint aligns
 * with Tailwind's sm:640px — at 640px both CSS (sm: applies) and JS agree.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 639px)");
    queueMicrotask(() => setIsMobile(mql.matches));
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);
  return isMobile;
}
