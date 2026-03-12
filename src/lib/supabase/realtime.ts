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

export type GroupMessage = {
  id: string;
  posting_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  related_posting_id: string | null;
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

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

function isMessage(value: unknown): value is Message {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.conversation_id === "string" &&
    typeof v.sender_id === "string" &&
    typeof v.content === "string" &&
    typeof v.created_at === "string"
  );
}

function isNotification(value: unknown): value is Notification {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.user_id === "string" &&
    typeof v.type === "string" &&
    typeof v.title === "string" &&
    typeof v.created_at === "string"
  );
}

function isConversation(value: unknown): value is Conversation {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.participant_1 === "string" &&
    typeof v.participant_2 === "string" &&
    typeof v.created_at === "string"
  );
}

function isPresenceStateArray(value: unknown): value is PresenceState[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as Record<string, unknown>).user_id === "string",
    )
  );
}

function isGroupMessage(value: unknown): value is GroupMessage {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.posting_id === "string" &&
    typeof v.sender_id === "string" &&
    typeof v.content === "string" &&
    typeof v.created_at === "string"
  );
}

function isPostingLike(
  value: unknown,
): value is { id: string; status: string; creator_id: string } {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === "string" && typeof v.status === "string";
}

// Exported for testing
export const _typeGuards = {
  isMessage,
  isNotification,
  isConversation,
  isPresenceStateArray,
  isGroupMessage,
  isPostingLike,
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
        if (isMessage(payload.new)) {
          onNewMessage(payload.new);
        } else {
          console.warn(
            "[Realtime] Unexpected message payload shape:",
            payload.new,
          );
        }
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
        if (isMessage(payload.new)) {
          onMessageUpdate?.(payload.new);
        } else {
          console.warn(
            "[Realtime] Unexpected message update payload shape:",
            payload.new,
          );
        }
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
        if (isNotification(payload.new)) {
          onNewNotification(payload.new);
        } else {
          console.warn(
            "[Realtime] Unexpected notification payload shape:",
            payload.new,
          );
        }
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
        if (isNotification(payload.new)) {
          onNotificationUpdate?.(payload.new);
        } else {
          console.warn(
            "[Realtime] Unexpected notification update payload shape:",
            payload.new,
          );
        }
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
        if (isNotification(payload.old)) {
          onNotificationDelete?.(payload.old);
        } else {
          console.warn(
            "[Realtime] Unexpected notification delete payload shape:",
            payload.old,
          );
        }
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
        if (!isConversation(payload.new)) {
          console.warn(
            "[Realtime] Unexpected conversation payload shape:",
            payload.new,
          );
          return;
        }
        // Only process if user is a participant
        if (
          payload.new.participant_1 === userId ||
          payload.new.participant_2 === userId
        ) {
          onConversationUpdate(payload.new);
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
      if (isPresenceStateArray(newPresences)) {
        onPresenceJoin?.(key, newPresences);
      } else {
        console.warn(
          "[Realtime] Unexpected presence join payload shape:",
          newPresences,
        );
      }
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      if (isPresenceStateArray(leftPresences)) {
        onPresenceLeave?.(key, leftPresences);
      } else {
        console.warn(
          "[Realtime] Unexpected presence leave payload shape:",
          leftPresences,
        );
      }
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

/**
 * Subscribe to real-time group messages for a posting
 */
export function subscribeToGroupMessages(
  postingId: string,
  onNewMessage: (message: GroupMessage) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`group-messages:${postingId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "group_messages",
        filter: `posting_id=eq.${postingId}`,
      },
      (payload) => {
        if (isGroupMessage(payload.new)) {
          onNewMessage(payload.new);
        } else {
          console.warn(
            "[Realtime] Unexpected group message payload shape:",
            payload.new,
          );
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[Realtime] Subscribed to group messages for posting ${postingId}`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          `[Realtime] Error subscribing to group messages for posting ${postingId}`,
        );
      }
    });

  return channel;
}

// ---------------------------------------------------------------------------
// Posting changes (for SWR cache invalidation)
// ---------------------------------------------------------------------------

export type PostingEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  posting: { id: string; status: string; creator_id: string };
};

/**
 * Subscribe to real-time posting changes (inserts, updates, deletes).
 * Used to invalidate SWR caches in the discover and active feeds.
 */
export function subscribeToPostings(
  onEvent: (event: PostingEvent) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel("postings:global")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "postings",
      },
      (payload) => {
        const record =
          payload.eventType === "DELETE" ? payload.old : payload.new;
        if (isPostingLike(record)) {
          onEvent({
            eventType: payload.eventType as PostingEvent["eventType"],
            posting: record,
          });
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log("[Realtime] Subscribed to postings changes");
      } else if (status === "CHANNEL_ERROR") {
        console.error("[Realtime] Error subscribing to postings changes");
      }
    });

  return channel;
}

// ---------------------------------------------------------------------------
// Space message types & subscription
// ---------------------------------------------------------------------------

export type SpaceMessagePayload = {
  id: string;
  space_id: string;
  sender_id: string | null;
  type: string;
  content: string | null;
  posting_id: string | null;
  created_at: string;
};

function isSpaceMessage(value: unknown): value is SpaceMessagePayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.space_id === "string" &&
    typeof v.type === "string" &&
    typeof v.created_at === "string"
  );
}

/**
 * Subscribe to real-time space messages (INSERT) for a given space.
 */
export function subscribeToSpaceMessages(
  spaceId: string,
  onNewMessage: (message: SpaceMessagePayload) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`space-messages:${spaceId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "space_messages",
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        if (isSpaceMessage(payload.new)) {
          onNewMessage(payload.new);
        } else {
          console.warn(
            "[Realtime] Unexpected space message payload shape:",
            payload.new,
          );
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[Realtime] Subscribed to space messages for space ${spaceId}`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          `[Realtime] Error subscribing to space messages for space ${spaceId}`,
        );
      }
    });

  return channel;
}

// ---------------------------------------------------------------------------
// Activity card types & subscription
// ---------------------------------------------------------------------------

export type ActivityCardPayload = {
  id: string;
  user_id: string;
  type: string;
  status: string;
  created_at: string;
};

function isActivityCard(value: unknown): value is ActivityCardPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.user_id === "string" &&
    typeof v.type === "string" &&
    typeof v.status === "string" &&
    typeof v.created_at === "string"
  );
}

/**
 * Subscribe to real-time activity card inserts for a user.
 */
export function subscribeToActivityCards(
  userId: string,
  onNewCard: (card: ActivityCardPayload) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`activity-cards:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "activity_cards",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (isActivityCard(payload.new)) {
          onNewCard(payload.new);
        } else {
          console.warn(
            "[Realtime] Unexpected activity card payload shape:",
            payload.new,
          );
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[Realtime] Subscribed to activity cards for user ${userId}`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          `[Realtime] Error subscribing to activity cards for user ${userId}`,
        );
      }
    });

  return channel;
}

// ---------------------------------------------------------------------------
// Space member changes subscription (for badge/unread updates)
// ---------------------------------------------------------------------------

export type SpaceMemberChangePayload = {
  space_id: string;
  user_id: string;
  unread_count: number;
  pinned: boolean;
  muted: boolean;
};

function isSpaceMemberChange(
  value: unknown,
): value is SpaceMemberChangePayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.space_id === "string" && typeof v.user_id === "string"
  );
}

/**
 * Subscribe to space_members changes for a user (badge updates, etc.).
 */
export function subscribeToSpaceMemberChanges(
  userId: string,
  onUpdate: (payload: SpaceMemberChangePayload) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`space-members:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "space_members",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (isSpaceMemberChange(payload.new)) {
          onUpdate(payload.new);
        } else {
          console.warn(
            "[Realtime] Unexpected space member payload shape:",
            payload.new,
          );
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[Realtime] Subscribed to space member changes for user ${userId}`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          `[Realtime] Error subscribing to space member changes for user ${userId}`,
        );
      }
    });

  return channel;
}
