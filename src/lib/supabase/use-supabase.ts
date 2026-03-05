"use client";

import { useMemo } from "react";
import { createClient } from "./client";

/**
 * React hook that returns a stable Supabase browser client.
 *
 * `createBrowserClient` already singletons internally, so this is
 * primarily DX sugar — eliminates the need to import `createClient`
 * and call it manually in every component/hook.
 */
export function useSupabase() {
  return useMemo(() => createClient(), []);
}
