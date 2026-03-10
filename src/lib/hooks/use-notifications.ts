"use client";

import { useCallback, useEffect, useRef } from "react";
import useSWR from "swr";
import { cacheKeys } from "@/lib/swr/keys";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/format";
import { getUserOrThrow } from "@/lib/supabase/auth";
import type { Notification } from "@/lib/supabase/realtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationData = {
  unreadCount: number;
  notifications: Notification[];
  userInitials: string;
  userId: string;
};

// ---------------------------------------------------------------------------
// Fetcher
// ---------------------------------------------------------------------------

async function fetchNotificationData(): Promise<NotificationData> {
  const { supabase, user } = await getUserOrThrow();

  const [{ data: profile }, { count }, { data: notifications }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("notifications")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .eq("read", false)
        .limit(0),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  return {
    userInitials: getInitials(profile?.full_name),
    unreadCount: count || 0,
    notifications: (notifications ?? []) as Notification[],
    userId: user.id,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotifications() {
  const supabaseRef = useRef(createClient());
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.notifications(),
    fetchNotificationData,
  );

  // Realtime subscription to auto-revalidate on notification changes
  useEffect(() => {
    if (!data?.userId) return;

    const supabase = supabaseRef.current;
    const channel = supabase
      .channel(`header-notifications:${data.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          mutate();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.userId, mutate]);

  const markAsRead = useCallback(
    async (id: string) => {
      const supabase = supabaseRef.current;
      await supabase.from("notifications").update({ read: true }).eq("id", id);
      mutate();
    },
    [mutate],
  );

  const userId = data?.userId;
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const supabase = supabaseRef.current;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
    mutate();
  }, [userId, mutate]);

  return {
    unreadCount: data?.unreadCount ?? 0,
    notifications: data?.notifications ?? [],
    userInitials: data?.userInitials ?? "U",
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
  };
}
