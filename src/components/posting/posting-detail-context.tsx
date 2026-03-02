"use client";

/**
 * Composite hook that combines all 3 posting contexts.
 * Provided for backward compatibility — prefer importing
 * the specific context hooks directly.
 */

export {
  usePostingCoreContext,
  PostingCoreProvider,
  type PostingCoreContextValue,
} from "./posting-core-context";

export {
  usePostingApplicationContext,
  PostingApplicationProvider,
  type PostingApplicationContextValue,
} from "./posting-application-context";

export {
  usePostingEditContext,
  PostingEditProvider,
  type PostingEditContextValue,
} from "./posting-edit-context";

import { usePostingCoreContext } from "./posting-core-context";
import { usePostingApplicationContext } from "./posting-application-context";
import { usePostingEditContext } from "./posting-edit-context";

import type { PostingCoreContextValue } from "./posting-core-context";
import type { PostingApplicationContextValue } from "./posting-application-context";
import type { PostingEditContextValue } from "./posting-edit-context";

export type PostingDetailContextValue = PostingCoreContextValue &
  PostingApplicationContextValue &
  PostingEditContextValue;

/** @deprecated Import from the specific context instead. */
export function usePostingDetailContext(): PostingDetailContextValue {
  return {
    ...usePostingCoreContext(),
    ...usePostingApplicationContext(),
    ...usePostingEditContext(),
  };
}
