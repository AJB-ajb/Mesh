"use client";

import { useState } from "react";

/**
 * Syncs a suggested value to local state until the user has interacted.
 *
 * When `suggested` changes and `userTouched` is false, the local value
 * updates to match. Once the user touches the field, the suggestion is
 * ignored.
 *
 * Uses the "previous value in state" pattern (no useEffect) for
 * synchronous render-time updates.
 */
export function useSyncedSuggestion<T>(
  suggested: T | undefined,
  userTouched: boolean,
  fallback: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(suggested ?? fallback);
  const [prev, setPrev] = useState(suggested);

  if (suggested !== prev) {
    setPrev(suggested);
    if (suggested !== undefined && !userTouched) {
      setValue(suggested);
    }
  }

  return [value, setValue];
}
