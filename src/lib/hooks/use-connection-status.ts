import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

export type ConnectionStatus =
  | "none"
  | "pending_incoming"
  | "pending_sent"
  | "accepted";

type ConnectionStatusData = {
  status: ConnectionStatus;
  friendshipId: string | null;
};

async function fetchConnectionStatus(key: string): Promise<ConnectionStatusData> {
  const [, currentUserId, otherUserId] = key.split("/");
  const supabase = createClient();

  const { data } = await supabase
    .from("friendships")
    .select("id, status, user_id, friend_id")
    .or(
      `and(user_id.eq.${currentUserId},friend_id.eq.${otherUserId}),and(user_id.eq.${otherUserId},friend_id.eq.${currentUserId})`,
    )
    .limit(1)
    .maybeSingle();

  if (!data) {
    return { status: "none", friendshipId: null };
  }

  if (data.status === "accepted") {
    return { status: "accepted", friendshipId: data.id };
  }

  if (data.status === "pending") {
    if (data.user_id === currentUserId) {
      return { status: "pending_sent", friendshipId: data.id };
    } else {
      return { status: "pending_incoming", friendshipId: data.id };
    }
  }

  return { status: "none", friendshipId: null };
}

export function useConnectionStatus(
  currentUserId: string | null,
  otherUserId: string | null,
) {
  const key =
    currentUserId && otherUserId
      ? `connection-status/${currentUserId}/${otherUserId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(
    key,
    fetchConnectionStatus,
  );

  return {
    status: data?.status ?? "none",
    friendshipId: data?.friendshipId ?? null,
    isLoading,
    error,
    mutate,
  };
}
