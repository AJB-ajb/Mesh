"use client";

import { useCallback } from "react";
import { useRealtimePresence } from "./use-realtime-presence";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Typing indicators for a space, built on the shared presence hook.
 *
 * Room ID: `presence:space:{spaceId}`
 *
 * Returns typing users (excluding current) and a `sendTyping()` helper.
 */
export function useSpacePresence(
  spaceId: string | null,
  currentUserId: string | null,
) {
  const roomId = spaceId ? `presence:space:${spaceId}` : null;

  const { typingUsers, onlineUsers, setIsTyping, isConnected } =
    useRealtimePresence({
      roomId,
      currentUserId,
      typingContextId: spaceId,
    });

  const sendTyping = useCallback(() => {
    setIsTyping(true);
  }, [setIsTyping]);

  const stopTyping = useCallback(() => {
    setIsTyping(false);
  }, [setIsTyping]);

  return {
    typingUsers,
    onlineUsers,
    sendTyping,
    stopTyping,
    isConnected,
  };
}
