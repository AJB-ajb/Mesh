"use client";

import { useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  subscribeToGroupMessages,
  unsubscribeChannel,
  type GroupMessage,
} from "@/lib/supabase/realtime";
import { useRealtimePresence } from "./use-realtime-presence";

type UseRealtimeGroupChatOptions = {
  postingId: string | null;
  currentUserId: string | null;
  onNewMessage?: (message: GroupMessage) => void;
};

type UseRealtimeGroupChatReturn = {
  typingUsers: string[];
  onlineUsers: string[];
  setIsTyping: (isTyping: boolean) => void;
  isConnected: boolean;
};

/**
 * Custom hook for group chat real-time functionality.
 * Handles new message events, typing indicators, and presence.
 */
export function useRealtimeGroupChat({
  postingId,
  currentUserId,
  onNewMessage,
}: UseRealtimeGroupChatOptions): UseRealtimeGroupChatReturn {
  const messageChannelRef = useRef<RealtimeChannel | null>(null);

  const { typingUsers, onlineUsers, setIsTyping, isConnected } =
    useRealtimePresence({
      roomId: postingId ? `group-chat:${postingId}` : null,
      currentUserId,
      // typing_in holds the posting_id when typing in group chat
      typingContextId: postingId,
    });

  // Subscribe to group message inserts
  useEffect(() => {
    if (!postingId || !currentUserId) return;

    messageChannelRef.current = subscribeToGroupMessages(
      postingId,
      (message) => {
        // Only forward messages from other users — own messages handled optimistically
        if (message.sender_id !== currentUserId) {
          onNewMessage?.(message);
        }
      },
    );

    return () => {
      if (messageChannelRef.current) {
        unsubscribeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
    };
  }, [postingId, currentUserId, onNewMessage]);

  return {
    typingUsers,
    onlineUsers,
    setIsTyping,
    isConnected,
  };
}
