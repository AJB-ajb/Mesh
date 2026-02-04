"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import {
  subscribeToMessages,
  createPresenceChannel,
  updateTypingStatus,
  unsubscribeChannel,
  type PresenceState,
  type Message,
} from "@/lib/supabase/realtime";

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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle presence state updates
  const handlePresenceSync = useCallback(
    (state: RealtimePresenceState<PresenceState>) => {
      const online: string[] = [];
      const typing: string[] = [];

      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          if (presence.user_id && presence.user_id !== currentUserId) {
            online.push(presence.user_id);
            if (presence.typing_in === conversationId) {
              typing.push(presence.user_id);
            }
          }
        });
      });

      setOnlineUsers([...new Set(online)]);
      setTypingUsers([...new Set(typing)]);
    },
    [conversationId, currentUserId],
  );

  // Subscribe to messages and presence
  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    // Subscribe to messages
    messageChannelRef.current = subscribeToMessages(
      conversationId,
      (message) => {
        // Only trigger callback for messages from other users
        if (message.sender_id !== currentUserId) {
          onNewMessage?.(message);
        }
      },
      (_message) => {
        // Handle message updates (e.g., read status)
      },
    );

    // Create presence channel for this conversation
    presenceChannelRef.current = createPresenceChannel(
      `chat:${conversationId}`,
      currentUserId,
      handlePresenceSync,
      (_key, _newPresences) => {
        // User joined
        queueMicrotask(() => setIsConnected(true));
      },
      (_key, _leftPresences) => {
        // User left
      },
    );

    queueMicrotask(() => setIsConnected(true));

    return () => {
      if (messageChannelRef.current) {
        unsubscribeChannel(messageChannelRef.current);
        messageChannelRef.current = null;
      }
      if (presenceChannelRef.current) {
        unsubscribeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      setIsConnected(false);
      setTypingUsers([]);
    };
  }, [conversationId, currentUserId, onNewMessage, handlePresenceSync]);

  // Set typing status with debounce
  const setIsTyping = useCallback(
    (isTyping: boolean) => {
      if (!presenceChannelRef.current || !currentUserId) return;

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (isTyping) {
        // Set typing status
        updateTypingStatus(
          presenceChannelRef.current,
          currentUserId,
          conversationId,
        );

        // Auto-clear typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          if (presenceChannelRef.current && currentUserId) {
            updateTypingStatus(presenceChannelRef.current, currentUserId, null);
          }
        }, 3000);
      } else {
        // Clear typing status
        updateTypingStatus(presenceChannelRef.current, currentUserId, null);
      }
    },
    [conversationId, currentUserId],
  );

  return {
    typingUsers,
    onlineUsers,
    setIsTyping,
    isConnected,
  };
}
