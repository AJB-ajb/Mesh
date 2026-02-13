import useSWR from "swr";
import type { Friendship } from "@/lib/supabase/types";

type FriendshipsResponse = {
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

export function useFriendships() {
  const { data, error, isLoading, mutate } =
    useSWR<FriendshipsResponse>("/api/friendships");

  return {
    friendships: data?.friendships ?? [],
    error,
    isLoading,
    mutate,
  };
}
