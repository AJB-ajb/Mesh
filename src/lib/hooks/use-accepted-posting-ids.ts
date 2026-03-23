"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchAcceptedPostingIds(key: string): Promise<string[]> {
  const spaceId = key.split("/")[1]; // accepted-posting-ids/{spaceId}
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("space_join_requests")
    .select("posting_id, space_postings!inner(space_id)")
    .eq("user_id", user.id)
    .eq("status", "accepted")
    .eq("space_postings.space_id", spaceId);

  if (error) throw error;

  return (data ?? []).map((row) => row.posting_id);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAcceptedPostingIds(spaceId: string | null) {
  const key = spaceId ? cacheKeys.acceptedPostingIds(spaceId) : null;

  const { data, error, isLoading } = useSWR(key, fetchAcceptedPostingIds, {
    keepPreviousData: true,
  });

  const acceptedPostingIds = useMemo(() => new Set(data ?? []), [data]);

  return {
    acceptedPostingIds,
    error,
    isLoading,
  };
}
