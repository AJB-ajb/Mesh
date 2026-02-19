"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import {
  subscribeToGroupMessages,
  createPresenceChannel,
  updateTypingStatus,
  unsubscribeChannel,
  type PresenceState,
  type GroupMessage,
} from "@/lib/supabase/realtime";

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
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const messageChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // The presence "room" uses postingId as the identifier
  const presenceRoomId = postingId ? `group-chat:${postingId}` : null;

  const handlePresenceSync = useCallback(
    (state: RealtimePresenceState<PresenceState>) => {
      const online: string[] = [];
      const typing: string[] = [];

      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          if (presence.user_id && presence.user_id !== currentUserId) {
            online.push(presence.user_id);
            // typing_in holds the posting_id when typing in group chat
            if (presence.typing_in === postingId) {
              typing.push(presence.user_id);
            }
          }
        });
      });

      setOnlineUsers([...new Set(online)]);
      setTypingUsers([...new Set(typing)]);
    },
    [postingId, currentUserId],
  );

  useEffect(() => {
    if (!postingId || !currentUserId || !presenceRoomId) return;

    // Subscribe to group message inserts
    messageChannelRef.current = subscribeToGroupMessages(
      postingId,
      (message) => {
        // Only forward messages from other users — own messages handled optimistically
        if (message.sender_id !== currentUserId) {
          onNewMessage?.(message);
        }
      },
    );

    // Create presence channel for typing indicators
    presenceChannelRef.current = createPresenceChannel(
      presenceRoomId,
      currentUserId,
      handlePresenceSync,
      () => {
        queueMicrotask(() => setIsConnected(true));
      },
      () => {
        // User left — presence sync handles state
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      setIsConnected(false);
      setTypingUsers([]);
    };
  }, [
    postingId,
    currentUserId,
    presenceRoomId,
    onNewMessage,
    handlePresenceSync,
  ]);

  const setIsTyping = useCallback(
    (isTyping: boolean) => {
      if (!presenceChannelRef.current || !currentUserId) return;

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }

      if (isTyping) {
        updateTypingStatus(
          presenceChannelRef.current,
          currentUserId,
          postingId,
        );

        typingTimeoutRef.current = setTimeout(() => {
          if (presenceChannelRef.current && currentUserId) {
            updateTypingStatus(presenceChannelRef.current, currentUserId, null);
          }
        }, 3000);
      } else {
        updateTypingStatus(presenceChannelRef.current, currentUserId, null);
      }
    },
    [postingId, currentUserId],
  );

  return {
    typingUsers,
    onlineUsers,
    setIsTyping,
    isConnected,
  };
}
