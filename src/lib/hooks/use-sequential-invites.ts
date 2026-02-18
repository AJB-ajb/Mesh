import useSWR from "swr";
import type { FriendAsk } from "@/lib/supabase/types";

type SequentialInviteWithPosting = FriendAsk & {
  posting: { id: string; title: string; status: string } | null;
};

type SequentialInvitesResponse = {
  friend_asks: SequentialInviteWithPosting[];
};

export function useSequentialInvites() {
  const { data, error, isLoading, mutate } =
    useSWR<SequentialInvitesResponse>("/api/friend-ask");

  return {
    sequentialInvites: data?.friend_asks ?? [],
    error,
    isLoading,
    mutate,
  };
}

/**
 * Fetch the active sequential invite for a specific posting.
 * Returns the first pending/accepted invite found, or null.
 */
export function useSequentialInviteForPosting(postingId: string | null) {
  const { sequentialInvites, error, isLoading, mutate } =
    useSequentialInvites();

  const sequentialInvite =
    sequentialInvites.find(
      (si) =>
        si.posting_id === postingId &&
        (si.status === "pending" || si.status === "accepted"),
    ) ??
    sequentialInvites.find(
      (si) =>
        si.posting_id === postingId &&
        (si.status === "completed" || si.status === "cancelled"),
    ) ??
    null;

  return {
    sequentialInvite,
    error,
    isLoading,
    mutate,
  };
}
