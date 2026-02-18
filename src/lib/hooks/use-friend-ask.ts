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

/**
 * Fetch the active friend-ask for a specific posting.
 * Returns the first pending/accepted friend-ask found, or null.
 * Also resolves friend names for the ordered list.
 */
export function useFriendAskForPosting(postingId: string | null) {
  const { friendAsks, error, isLoading, mutate } = useFriendAsks();

  const friendAsk =
    friendAsks.find(
      (fa) =>
        fa.posting_id === postingId &&
        (fa.status === "pending" || fa.status === "accepted"),
    ) ??
    friendAsks.find(
      (fa) =>
        fa.posting_id === postingId &&
        (fa.status === "completed" || fa.status === "cancelled"),
    ) ??
    null;

  return {
    friendAsk,
    error,
    isLoading,
    mutate,
  };
}
