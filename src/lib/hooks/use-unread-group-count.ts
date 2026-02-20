"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

async function fetchUnreadCount(
  postingId: string,
  userId: string,
): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("unread_group_message_count", {
    p_posting_id: postingId,
    p_user_id: userId,
  });
  if (error) {
    console.warn("[useUnreadGroupCount] RPC error:", error);
    return 0;
  }
  return (data as number) ?? 0;
}

export function useUnreadGroupCount(postingId: string, userId: string | null) {
  const key = userId ? `unread-group-count/${postingId}/${userId}` : null;

  const { data } = useSWR(key, () => fetchUnreadCount(postingId, userId!), {
    refreshInterval: 30_000,
  });

  return data ?? 0;
}
