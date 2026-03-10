"use client";

import { useEffect, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { unsubscribeChannel } from "@/lib/supabase/realtime";
import { useRealtimePresence } from "./use-realtime-presence";

type UseRealtimeChannelOptions<TMessage extends { sender_id: string }> = {
  /** Unique identifier for the entity (conversationId or postingId) */
  entityId: string | null;
  currentUserId: string | null;
  /** Prefix for the presence room, e.g. "chat" or "group-chat" */
  roomPrefix: string;
  /** Function that subscribes to the channel and returns it */
  subscribe: (
    entityId: string,
    onMessage: (msg: TMessage) => void,
  ) => RealtimeChannel;
  onNewMessage?: (message: TMessage) => void;
};

type UseRealtimeChannelReturn = {
  typingUsers: string[];
  onlineUsers: string[];
  setIsTyping: (isTyping: boolean) => void;
  isConnected: boolean;
};

/**
 * Shared base hook for real-time chat channel subscriptions.
 * Handles message subscriptions, typing indicators, and presence.
 */
export function useRealtimeChannel<TMessage extends { sender_id: string }>({
  entityId,
  currentUserId,
  roomPrefix,
  subscribe,
  onNewMessage,
}: UseRealtimeChannelOptions<TMessage>): UseRealtimeChannelReturn {
  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const onNewMessageRef = useRef(onNewMessage);
  const subscribeRef = useRef(subscribe);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
    subscribeRef.current = subscribe;
  });

  const { typingUsers, onlineUsers, setIsTyping, isConnected } =
    useRealtimePresence({
      roomId: entityId ? `${roomPrefix}:${entityId}` : null,
      currentUserId,
      typingContextId: entityId,
    });

  useEffect(() => {
    if (!entityId || !currentUserId) return;

    messageChannelRef.current = subscribeRef.current(entityId, (message) => {
      // Only forward messages from other users — own messages handled optimistically
      if (message.sender_id !== currentUserId) {
        onNewMessageRef.current?.(message);
      }
    });

    return () => {
      if (messageChannelRef.current) {
        unsubscribeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
    };
  }, [entityId, currentUserId]);

  return {
    typingUsers,
    onlineUsers,
    setIsTyping,
    isConnected,
  };
}
