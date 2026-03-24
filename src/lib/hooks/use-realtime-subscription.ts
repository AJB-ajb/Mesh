"use client";

import { useEffect, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { unsubscribeChannel } from "@/lib/supabase/realtime";

/**
 * Shared hook for subscribing to a Supabase realtime channel that
 * triggers SWR revalidation on events.
 *
 * Manages the `mutateRef` pattern internally so callers don't repeat it.
 */
export function useRealtimeSubscription(
  key: string | null,
  subscribeFn: (key: string, callback: () => void) => RealtimeChannel,
  mutate: () => void,
): void {
  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  useEffect(() => {
    if (!key) return;

    const channel = subscribeFn(key, () => {
      mutateRef.current();
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [key, subscribeFn]);
}
