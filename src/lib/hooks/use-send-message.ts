"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/hooks/use-inbox";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSendMessage(
  conversationId: string,
  currentUserId: string | null,
  conversation: {
    participant_1: string;
    participant_2: string;
  },
  onOptimisticMessage: (message: Message) => void,
  mutateMessages: () => void,
) {
  const [isSending, setIsSending] = useState(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || !currentUserId) return;

      setIsSending(true);
      const supabase = createClient();

      const { data: message, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error sending message:", error);
        setIsSending(false);
        return;
      }

      onOptimisticMessage(message);

      // Create notification for other user (fire-and-forget with error logging)
      const otherUserId =
        conversation.participant_1 === currentUserId
          ? conversation.participant_2
          : conversation.participant_1;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", currentUserId)
        .maybeSingle();

      supabase
        .from("notifications")
        .insert({
          user_id: otherUserId,
          type: "new_message",
          title: "New Message",
          body: `${profile?.full_name || "Someone"}: ${content.trim().slice(0, 50)}${content.length > 50 ? "..." : ""}`,
          related_user_id: currentUserId,
        })
        .then(({ error: notifError }) => {
          if (notifError)
            console.error("Error creating notification:", notifError);
        });

      setIsSending(false);
      mutateMessages();
    },
    [
      conversationId,
      currentUserId,
      conversation,
      onOptimisticMessage,
      mutateMessages,
    ],
  );

  return { sendMessage, isSending };
}
