"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";
import { subscribeToSpacePostings } from "@/lib/supabase/realtime";
import type { SpacePostingWithCreator } from "@/lib/supabase/types";
import { useRealtimeSubscription } from "./use-realtime-subscription";

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

  const postings = (data ?? []) as SpacePostingWithCreator[];

  // Fetch reply counts for postings that have sub-spaces
  const subSpaceIds = postings
    .map((p) => p.sub_space_id)
    .filter((id): id is string => id != null);

  if (subSpaceIds.length > 0) {
    const { data: counts } = await supabase.rpc("get_reply_counts", {
      sub_space_ids: subSpaceIds,
    });

    if (counts) {
      const countMap = new Map(
        (counts as { space_id: string; count: number }[]).map((r) => [
          r.space_id,
          Number(r.count),
        ]),
      );
      return postings.map((p) =>
        p.sub_space_id
          ? { ...p, replyCount: countMap.get(p.sub_space_id) ?? 0 }
          : p,
      );
    }
  }

  return postings;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSpacePostings(spaceId: string | null) {
  const key = spaceId ? cacheKeys.spacePostings(spaceId) : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetchSpacePostings, {
    keepPreviousData: true,
  });

  useRealtimeSubscription(spaceId, subscribeToSpacePostings, mutate);

  return {
    postings: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
