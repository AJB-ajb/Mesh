import useSWR from "swr";
import type { MatchResponse } from "@/lib/supabase/types";

type MatchesResponse = {
  matches: MatchResponse[];
  error?: string;
};

export function useMatches() {
  const { data, error, isLoading, mutate } = useSWR<MatchesResponse>(
    "/api/matches/for-me",
  );

  return {
    matches: data?.matches ?? [],
    apiError: data?.error ?? null,
    error,
    isLoading,
    mutate,
  };
}
