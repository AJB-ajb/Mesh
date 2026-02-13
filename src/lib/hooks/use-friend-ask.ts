import useSWR from "swr";
import type { FriendAsk } from "@/lib/supabase/types";

type FriendAskWithPosting = FriendAsk & {
  posting: { id: string; title: string; status: string } | null;
};

type FriendAsksResponse = {
  friend_asks: FriendAskWithPosting[];
};

export function useFriendAsks() {
  const { data, error, isLoading, mutate } =
    useSWR<FriendAsksResponse>("/api/friend-ask");

  return {
    friendAsks: data?.friend_asks ?? [],
    error,
    isLoading,
    mutate,
  };
}
