/**
 * Real-time utilities for Supabase
 * Handles notifications, typing indicators, and presence
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

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

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

// Exported for testing
export const _typeGuards = {
  isNotification,
  isPresenceStateArray,
};

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

// ---------------------------------------------------------------------------
// Space posting types & subscription
// ---------------------------------------------------------------------------

export type SpacePostingPayload = {
  id: string;
  space_id: string;
  created_by: string;
  status: string;
  created_at: string;
};

function isSpacePosting(value: unknown): value is SpacePostingPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.space_id === "string" &&
    typeof v.created_at === "string"
  );
}

export type SpacePostingEvent = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  posting: SpacePostingPayload;
};

/**
 * Subscribe to real-time space posting changes for a given space.
 */
export function subscribeToSpacePostings(
  spaceId: string,
  onEvent: (event: SpacePostingEvent) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`space-postings:${spaceId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "space_postings",
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        const record =
          payload.eventType === "DELETE" ? payload.old : payload.new;
        if (isSpacePosting(record)) {
          onEvent({
            eventType: payload.eventType as SpacePostingEvent["eventType"],
            posting: record,
          });
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[Realtime] Subscribed to space postings for space ${spaceId}`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          `[Realtime] Error subscribing to space postings for space ${spaceId}`,
        );
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

/**
 * Subscribe to real-time space messages (INSERT) for multiple spaces
 * using a single channel with an `in` filter. More efficient than
 * one channel per space.
 */
export function subscribeToSpaceMessagesBatch(
  spaceIds: string[],
  onNewMessage: (message: SpaceMessagePayload) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`space-messages:batch`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "space_messages",
        filter: `space_id=in.(${spaceIds.join(",")})`,
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
          `[Realtime] Subscribed to space messages for ${spaceIds.length} spaces`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(`[Realtime] Error subscribing to batch space messages`);
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
// Space card types & subscription
// ---------------------------------------------------------------------------

export type SpaceCardPayload = {
  id: string;
  space_id: string;
  type: string;
  status: string;
  data: Record<string, unknown>;
  updated_at: string;
};

function isSpaceCard(value: unknown): value is SpaceCardPayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.space_id === "string" &&
    typeof v.type === "string" &&
    typeof v.status === "string"
  );
}

/**
 * Subscribe to real-time space card UPDATE events (vote changes, resolution).
 */
export function subscribeToSpaceCards(
  spaceId: string,
  onUpdate: (card: SpaceCardPayload) => void,
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`space-cards:${spaceId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "space_cards",
        filter: `space_id=eq.${spaceId}`,
      },
      (payload) => {
        if (isSpaceCard(payload.new)) {
          onUpdate(payload.new);
        } else {
          console.warn(
            "[Realtime] Unexpected space card payload shape:",
            payload.new,
          );
        }
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(
          `[Realtime] Subscribed to space cards for space ${spaceId}`,
        );
      } else if (status === "CHANNEL_ERROR") {
        console.error(
          `[Realtime] Error subscribing to space cards for space ${spaceId}`,
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
  return typeof v.space_id === "string" && typeof v.user_id === "string";
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
