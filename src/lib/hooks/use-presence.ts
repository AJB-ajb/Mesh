"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { PresenceState } from "@/lib/supabase/realtime";

type UsePresenceReturn = {
  onlineUsers: Map<string, { online_at: string }>;
  isUserOnline: (userId: string) => boolean;
  getLastSeen: (userId: string) => string | null;
};

/**
 * Global presence hook for tracking online users
 * Should be used at the app level (e.g., in a provider)
 */
export function usePresence(currentUserId: string | null): UsePresenceReturn {
  const [onlineUsers, setOnlineUsers] = useState<
    Map<string, { online_at: string }>
  >(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();

    // Create a global presence channel
    const channel = supabase.channel("global:presence", {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceState>();
        const users = new Map<string, { online_at: string }>();

        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            if (presence.user_id) {
              users.set(presence.user_id, { online_at: presence.online_at });
            }
          });
        });

        setOnlineUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
          } as PresenceState);
        }
      });

    channelRef.current = channel;

    // Update presence periodically to keep it fresh
    const interval = setInterval(async () => {
      if (channelRef.current) {
        await channelRef.current.track({
          user_id: currentUserId,
          online_at: new Date().toISOString(),
        } as PresenceState);
      }
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [currentUserId]);

  const isUserOnline = useCallback(
    (userId: string): boolean => {
      return onlineUsers.has(userId);
    },
    [onlineUsers],
  );

  const getLastSeen = useCallback(
    (userId: string): string | null => {
      const user = onlineUsers.get(userId);
      return user?.online_at || null;
    },
    [onlineUsers],
  );

  return {
    onlineUsers,
    isUserOnline,
    getLastSeen,
  };
}
