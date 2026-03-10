"use client";

import { useCallback } from "react";
import {
  subscribeToGroupMessages,
  type GroupMessage,
} from "@/lib/supabase/realtime";
import { useRealtimeChannel } from "./use-realtime-channel";

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
  const subscribe = useCallback(
    (id: string, onMessage: (msg: GroupMessage) => void) =>
      subscribeToGroupMessages(id, onMessage),
    [],
  );

  return useRealtimeChannel<GroupMessage>({
    entityId: postingId,
    currentUserId,
    roomPrefix: "group-chat",
    subscribe,
    onNewMessage,
  });
}
