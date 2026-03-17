"use client";

import { SWRConfig } from "swr";

/**
 * Wraps children in a nested SWRConfig that provides server-fetched fallback
 * data. SWR merges this with the global config, so hooks using matching keys
 * render instantly without a loading state on first paint.
 */
export function SWRFallback({
  fallback,
  children,
}: {
  fallback: Record<string, unknown>;
  children: React.ReactNode;
}) {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}
