import useSWR from "swr";
import { cacheKeys } from "@/lib/swr/keys";
import type { MatchResponse } from "@/lib/supabase/types";

type MatchesResponse = {
  matches: MatchResponse[];
  error?: string;
};

export function useMatches() {
  const { data, error, isLoading, mutate } = useSWR<MatchesResponse>(
    cacheKeys.matches(),
  );

  return {
    matches: data?.matches ?? [],
    apiError: data?.error ?? null,
    error,
    isLoading,
    mutate,
  };
}
