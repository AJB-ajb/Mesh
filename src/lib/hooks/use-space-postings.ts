"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";
import type { SpacePostingWithCreator, Profile } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchSpacePostings(
  key: string,
): Promise<SpacePostingWithCreator[]> {
  const spaceId = key.split("/")[3]; // /api/spaces/{id}/postings
  const supabase = createClient();

  const { data, error } = await supabase
    .from("space_postings")
    .select("*, profiles:created_by(full_name, user_id)")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as SpacePostingWithCreator[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpacePostings(spaceId: string | null) {
  const key = spaceId ? cacheKeys.spacePostings(spaceId) : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetchSpacePostings, {
    keepPreviousData: true,
  });

  return {
    postings: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
