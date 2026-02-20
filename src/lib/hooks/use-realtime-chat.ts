"use client";

import { useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import {
  subscribeToMessages,
  unsubscribeChannel,
  type Message,
} from "@/lib/supabase/realtime";
import { useRealtimePresence } from "./use-realtime-presence";

type UseRealtimeChatOptions = {
  conversationId: string | null;
  currentUserId: string | null;
  onNewMessage?: (message: Message) => void;
};

type UseRealtimeChatReturn = {
  typingUsers: string[];
  onlineUsers: string[];
  setIsTyping: (isTyping: boolean) => void;
  isConnected: boolean;
};

/**
 * Custom hook for real-time chat functionality
 * Handles messages, typing indicators, and presence
 */
export function useRealtimeChat({
  conversationId,
  currentUserId,
  onNewMessage,
}: UseRealtimeChatOptions): UseRealtimeChatReturn {
  const messageChannelRef = useRef<RealtimeChannel | null>(null);

  const { typingUsers, onlineUsers, setIsTyping, isConnected } =
    useRealtimePresence({
      roomId: conversationId ? `chat:${conversationId}` : null,
      currentUserId,
      typingContextId: conversationId,
    });

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    messageChannelRef.current = subscribeToMessages(
      conversationId,
      (message) => {
        // Only trigger callback for messages from other users
        if (message.sender_id !== currentUserId) {
          onNewMessage?.(message);
        }
      },
      () => {
        // Handle message updates (e.g., read status)
      },
    );

    return () => {
      if (messageChannelRef.current) {
        unsubscribeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
    };
  }, [conversationId, currentUserId, onNewMessage]);

  return {
    typingUsers,
    onlineUsers,
    setIsTyping,
    isConnected,
  };
}
