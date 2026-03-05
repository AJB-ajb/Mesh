/**
 * SWR optimistic update helper.
 *
 * Wraps common mutator options for optimistic UI — show the new data
 * immediately, roll back on error, and skip re-fetching.
 *
 * Usage:
 *   mutate(cacheKeys.bookmarks(), newData, optimistic(newData));
 */

import type { MutatorOptions } from "swr";

export function optimistic<T>(data: T): MutatorOptions<T> {
  return { optimisticData: data, rollbackOnError: true, revalidate: false };
}
