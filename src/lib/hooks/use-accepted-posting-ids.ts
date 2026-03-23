"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchAcceptedPostingIds(key: string): Promise<Set<string>> {
  // Key format: accepted-posting-ids/{spaceId}
  const spaceId = key.split("/")[1];
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return new Set();

  const { data, error } = await supabase
    .from("space_join_requests")
    .select("posting_id, space_postings!inner(space_id)")
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .eq("space_postings.space_id", spaceId);

  if (error) throw error;

  return new Set(data?.map((r) => r.posting_id) ?? []);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAcceptedPostingIds(spaceId: string | null) {
  const key = spaceId ? cacheKeys.acceptedPostingIds(spaceId) : null;

  const { data, error, isLoading } = useSWR(key, fetchAcceptedPostingIds);

  return {
    acceptedPostingIds: data ?? new Set<string>(),
    error,
    isLoading,
  };
}
