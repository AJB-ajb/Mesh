"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import {
  createPresenceChannel,
  updateTypingStatus,
  unsubscribeChannel,
  type PresenceState,
} from "@/lib/supabase/realtime";

type UseRealtimePresenceOptions = {
  roomId: string | null;
  currentUserId: string | null;
  /**
   * The identifier used in presence.typing_in to match against.
   * For conversations this is the conversationId, for group chats it is the
   * postingId.
   */
  typingContextId: string | null;
};

type UseRealtimePresenceReturn = {
  typingUsers: string[];
  onlineUsers: string[];
  setIsTyping: (isTyping: boolean) => void;
  isConnected: boolean;
  presenceChannelRef: React.MutableRefObject<RealtimeChannel | null>;
};

/**
 * Extracted shared presence/typing logic used by both useRealtimeChat and
 * useRealtimeGroupChat.
 *
 * Handles:
 * - Presence channel setup (track online users, typing users)
 * - Typing timeout (3-second auto-clear)
 *
 * Returns the presenceChannelRef so callers can pass it to cleanup routines
 * alongside their own message channel ref.
 */
export function useRealtimePresence({
  roomId,
  currentUserId,
  typingContextId,
}: UseRealtimePresenceOptions): UseRealtimePresenceReturn {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePresenceSync = useCallback(
    (state: RealtimePresenceState<PresenceState>) => {
      const online: string[] = [];
      const typing: string[] = [];

      Object.values(state).forEach((presences) => {
        presences.forEach((presence) => {
          if (presence.user_id && presence.user_id !== currentUserId) {
            online.push(presence.user_id);
            if (presence.typing_in === typingContextId) {
              typing.push(presence.user_id);
            }
          }
        });
      });

      setOnlineUsers([...new Set(online)]);
      setTypingUsers([...new Set(typing)]);
    },
    [typingContextId, currentUserId],
  );

  useEffect(() => {
    if (!roomId || !currentUserId) return;

    presenceChannelRef.current = createPresenceChannel(
      roomId,
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (presenceChannelRef.current) {
        unsubscribeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      setIsConnected(false);
      setTypingUsers([]);
    };
  }, [roomId, currentUserId, handlePresenceSync]);

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
          typingContextId,
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
    [typingContextId, currentUserId],
  );

  return {
    typingUsers,
    onlineUsers,
    setIsTyping,
    isConnected,
    presenceChannelRef,
  };
}
