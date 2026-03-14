"use client";

import { useEffect, useRef } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { cacheKeys } from "@/lib/swr/keys";
import {
  subscribeToSpacePostings,
  unsubscribeChannel,
} from "@/lib/supabase/realtime";
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

  const mutateRef = useRef(mutate);
  useEffect(() => {
    mutateRef.current = mutate;
  }, [mutate]);

  // Subscribe to realtime posting changes
  useEffect(() => {
    if (!spaceId) return;

    const channel = subscribeToSpacePostings(spaceId, () => {
      mutateRef.current();
    });

    return () => {
      unsubscribeChannel(channel);
    };
  }, [spaceId]);

  return {
    postings: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
