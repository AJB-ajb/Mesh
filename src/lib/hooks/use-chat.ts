"use client";

import { useRealtimeChat } from "./use-realtime-chat";
import { useRealtimeGroupChat } from "./use-realtime-group-chat";
import { useConversationMessages, useInboxData } from "./use-inbox";
import { useGroupMessages } from "./use-group-messages";
import type { Message as RealtimeMessage } from "@/lib/supabase/realtime";
import type { GroupMessage } from "@/lib/supabase/realtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseChatOptions {
  /** For DM conversations */
  conversationId?: string | null;
  /** For group chat (posting-based) */
  postingId?: string | null;
  /** Current user ID */
  userId?: string | null;
  /** Callback when a new realtime message arrives (from another user) */
  onNewMessage?: (message: RealtimeMessage | GroupMessage) => void;
}

// ---------------------------------------------------------------------------
// Facade — composes chat sub-hooks into a unified API.
// ---------------------------------------------------------------------------

/**
 * Facade hook that unifies DM and group chat functionality.
 *
 * - For DMs: pass `conversationId` + `userId`
 * - For group chat: pass `postingId` + `userId`
 *
 * Sub-hooks remain available for granular use; this facade is an
 * additional convenience, not a replacement.
 */
export function useChat(options: UseChatOptions) {
  const {
    conversationId = null,
    postingId = null,
    userId = null,
    onNewMessage,
  } = options;

  const isGroupChat = !!postingId;

  // --- DM hooks (only activated when conversationId is provided) -----------

  const dmRealtime = useRealtimeChat({
    conversationId: !isGroupChat ? (conversationId ?? null) : null,
    currentUserId: !isGroupChat ? userId : null,
    onNewMessage: !isGroupChat
      ? (onNewMessage as ((msg: RealtimeMessage) => void) | undefined)
      : undefined,
  });

  const dmMessages = useConversationMessages(
    !isGroupChat ? (conversationId ?? null) : null,
    !isGroupChat ? userId : null,
  );

  // --- Group chat hooks (only activated when postingId is provided) --------

  const groupRealtime = useRealtimeGroupChat({
    postingId: isGroupChat ? postingId : null,
    currentUserId: isGroupChat ? userId : null,
    onNewMessage: isGroupChat
      ? (onNewMessage as ((msg: GroupMessage) => void) | undefined)
      : undefined,
  });

  const groupMessages = useGroupMessages(
    isGroupChat ? (postingId ?? "") : "",
    isGroupChat ? userId : null,
  );

  // --- Inbox (always available) --------------------------------------------

  const inbox = useInboxData();

  // --- Unified return ------------------------------------------------------

  return {
    // Messages
    messages: isGroupChat ? groupMessages.messages : dmMessages.messages,
    isLoading: isGroupChat ? groupMessages.isLoading : dmMessages.isLoading,
    mutateMessages: isGroupChat ? groupMessages.mutate : dmMessages.mutate,

    // Realtime presence
    typingUsers: isGroupChat
      ? groupRealtime.typingUsers
      : dmRealtime.typingUsers,
    onlineUsers: isGroupChat
      ? groupRealtime.onlineUsers
      : dmRealtime.onlineUsers,
    setIsTyping: isGroupChat
      ? groupRealtime.setIsTyping
      : dmRealtime.setIsTyping,
    isConnected: isGroupChat
      ? groupRealtime.isConnected
      : dmRealtime.isConnected,

    // Inbox / conversation list
    conversations: inbox.conversations,
    inboxLoading: inbox.isLoading,

    // Context
    isGroupChat,
  };
}
