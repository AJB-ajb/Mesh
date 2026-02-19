import useSWR from "swr";
import { useEffect, useState } from "react";

export type ProfileSearchResult = {
  user_id: string;
  full_name: string | null;
  headline: string | null;
  connectionStatus: "none" | "pending_sent" | "pending_incoming" | "accepted";
};

async function fetchProfileSearch(key: string): Promise<ProfileSearchResult[]> {
  const q = key.replace("profile-search/", "");
  if (!q.trim()) return [];

  const res = await fetch(
    `/api/profiles/search?q=${encodeURIComponent(q.trim())}`,
  );
  if (!res.ok) return [];

  const data = await res.json();
  return data.profiles ?? [];
}

export function useProfileSearch(rawQuery: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(rawQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(rawQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const { data, error, isLoading, mutate } = useSWR(
    debouncedQuery.trim().length >= 2
      ? `profile-search/${debouncedQuery.trim()}`
      : null,
    fetchProfileSearch,
  );

  return {
    results: data ?? [],
    error,
    isLoading,
    mutate,
  };
}
