import useSWR from "swr";
import { cacheKeys } from "@/lib/swr/keys";
import type { Friendship } from "@/lib/supabase/types";

type ConnectionsResponse = {
  friendships: (Friendship & {
    friend: {
      user_id: string;
      full_name: string | null;
      headline: string | null;
    } | null;
    user: {
      user_id: string;
      full_name: string | null;
      headline: string | null;
    } | null;
  })[];
};

export function useConnections() {
  const { data, error, isLoading, mutate } = useSWR<ConnectionsResponse>(
    cacheKeys.connections(),
  );

  return {
    connections: data?.friendships ?? [],
    error,
    isLoading,
    mutate,
  };
}
