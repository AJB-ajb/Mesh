"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GroupMessageWithSender = {
  id: string;
  posting_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name: string | null;
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchGroupMessages(
  postingId: string,
  userId: string,
): Promise<GroupMessageWithSender[]> {
  const supabase = createClient();

  // Fetch messages ordered by created_at
  const { data: messages, error } = await supabase
    .from("group_messages")
    .select("id, posting_id, sender_id, content, created_at")
    .eq("posting_id", postingId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!messages || messages.length === 0) return [];

  // Batch-fetch unique sender profiles
  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", senderIds);

  const nameById = new Map<string, string | null>();
  for (const p of profiles ?? []) {
    nameById.set(p.user_id, p.full_name);
  }

  // Mark all fetched messages as read (fire-and-forget)
  const messageIds = messages.map((m) => m.id);
  supabase
    .from("group_message_reads")
    .upsert(
      messageIds.map((message_id) => ({ message_id, user_id: userId })),
      { onConflict: "message_id,user_id" },
    )
    .then(({ error: readError }) => {
      if (readError) {
        console.warn(
          "[GroupMessages] Error marking messages as read:",
          readError,
        );
      }
    });

  return messages.map((m) => ({
    ...m,
    sender_name: nameById.get(m.sender_id) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGroupMessages(postingId: string, userId: string | null) {
  const key = userId ? `group-messages/${postingId}/${userId}` : null;

  const { data, error, isLoading, mutate } = useSWR(key, () =>
    fetchGroupMessages(postingId, userId!),
  );

  return {
    messages: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

// ---------------------------------------------------------------------------
// Helper: mark a single new message as read
// ---------------------------------------------------------------------------

export async function markGroupMessageRead(
  messageId: string,
  userId: string,
): Promise<void> {
  const supabase = createClient();
  await supabase
    .from("group_message_reads")
    .upsert(
      { message_id: messageId, user_id: userId },
      { onConflict: "message_id,user_id" },
    );
}
