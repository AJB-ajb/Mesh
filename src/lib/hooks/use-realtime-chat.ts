"use client";

import { useCallback } from "react";
import {
  subscribeToMessages,
  type Message,
} from "@/lib/supabase/realtime";
import { useRealtimeChannel } from "./use-realtime-channel";

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
  const subscribe = useCallback(
    (id: string, onMessage: (msg: Message) => void) =>
      subscribeToMessages(
        id,
        onMessage,
        () => {
          // Handle message updates (e.g., read status)
        },
      ),
    [],
  );

  return useRealtimeChannel<Message>({
    entityId: conversationId,
    currentUserId,
    roomPrefix: "chat",
    subscribe,
    onNewMessage,
  });
}
