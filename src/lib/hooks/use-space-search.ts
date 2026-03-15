"use client";

import useSWR from "swr";
import { cacheKeys } from "@/lib/swr/keys";

interface SpaceSearchResult {
  message_id: string;
  content: string;
  sender_id: string;
  sender_name: string | null;
  created_at: string;
  type: string;
  rank: number;
}

async function fetchSearch(key: string): Promise<SpaceSearchResult[]> {
  const res = await fetch(key);
  if (!res.ok) return [];
  const json = await res.json();
  return json.messages ?? [];
}

export function useSpaceSearch(spaceId: string, query: string) {
  const trimmed = query.trim();
  const key =
    trimmed.length >= 2 ? cacheKeys.spaceSearch(spaceId, trimmed) : null;

  const { data, error, isLoading } = useSWR(key, fetchSearch, {
    dedupingInterval: 300,
    keepPreviousData: true,
  });

  return {
    results: data ?? [],
    error,
    isLoading,
  };
}
