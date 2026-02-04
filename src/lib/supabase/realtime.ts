/**
 * Real-time utilities for Supabase
 * Handles messages, notifications, typing indicators, and presence
 */

import { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { createClient } from "./client";

export type PresenceState = {
  user_id: string;
  online_at: string;
  typing_in?: string; // conversation_id if typing
};

export type TypingUser = {
  user_id: string;
  conversation_id: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  related_project_id: string | null;
  related_application_id: string | null;
  related_user_id: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Subscribe to real-time messages for a conversation
 */
export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void,
  onMessageUpdate?: (message: Message) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onNewMessage(payload.new as unknown as Message);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessageUpdate?.(payload.new as unknown as Message);
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[Realtime] Subscribed to messages for conversation ${conversationId}`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          `[Realtime] Error subscribing to messages for conversation ${conversationId}`,
        );
      }
    });

  return channel;
}

/**
 * Subscribe to real-time notifications for a user
 */
export function subscribeToNotifications(
  userId: string,
  onNewNotification: (notification: Notification) => void,
  onNotificationUpdate?: (notification: Notification) => void,
  onNotificationDelete?: (notification: Notification) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNewNotification(payload.new as unknown as Notification);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotificationUpdate?.(payload.new as unknown as Notification);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        onNotificationDelete?.(payload.old as unknown as Notification);
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[Realtime] Subscribed to notifications for user ${userId}`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          `[Realtime] Error subscribing to notifications for user ${userId}`,
        );
      }
    });

  return channel;
}

/**
 * Subscribe to conversation updates (for last message, etc.)
 */
export function subscribeToConversations(
  userId: string,
  onConversationUpdate: (conversation: Conversation) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "conversations",
      },
      (payload) => {
        const conv = payload.new as unknown as Conversation;
        // Only process if user is a participant
        if (
          conv &&
          (conv.participant_1 === userId || conv.participant_2 === userId)
        ) {
          onConversationUpdate(conv);
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[Realtime] Subscribed to conversations for user ${userId}`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          `[Realtime] Error subscribing to conversations for user ${userId}`,
        );
      }
    });

  return channel;
}

/**
 * Create a presence channel for typing indicators and online status
 */
export function createPresenceChannel(
  roomId: string,
  userId: string,
  onPresenceSync: (state: RealtimePresenceState<PresenceState>) => void,
  onPresenceJoin?: (key: string, newPresence: PresenceState[]) => void,
  onPresenceLeave?: (key: string, leftPresence: PresenceState[]) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase.channel(roomId, {
    config: {
      presence: {
        key: userId,
      },
    },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceState>();
      onPresenceSync(state);
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      onPresenceJoin?.(key, newPresences as unknown as PresenceState[]);
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      onPresenceLeave?.(key, leftPresences as unknown as PresenceState[]);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
        } as PresenceState);
      }
    });

  return channel;
}

/**
 * Update typing status in a presence channel
 */
export async function updateTypingStatus(
  channel: RealtimeChannel,
  userId: string,
  conversationId: string | null,
): Promise<void> {
  await channel.track({
    user_id: userId,
    online_at: new Date().toISOString(),
    typing_in: conversationId || undefined,
  } as PresenceState);
}

/**
 * Clean up a channel subscription
 */
export function unsubscribeChannel(channel: RealtimeChannel): void {
  const supabase = createClient();
  supabase.removeChannel(channel);
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Show a browser notification
 */
export function showBrowserNotification(
  title: string,
  body: string,
  onClick?: () => void,
): void {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
  });

  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }

  // Auto-close after 5 seconds
  setTimeout(() => notification.close(), 5000);
}
