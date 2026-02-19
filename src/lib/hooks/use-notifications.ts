"use client";

import { useCallback, useEffect } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/format";
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
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const [{ data: profile }, { count }, { data: notifications }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false),
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
  const { data, error, isLoading, mutate } = useSWR(
    "header-notifications",
    fetchNotificationData,
  );

  // Realtime subscription to auto-revalidate on notification changes
  useEffect(() => {
    if (!data?.userId) return;

    const supabase = createClient();
    const channel = supabase
      .channel("header-notifications")
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
      const supabase = createClient();
      await supabase.from("notifications").update({ read: true }).eq("id", id);
      mutate();
    },
    [mutate],
  );

  const userId = data?.userId;
  const markAllAsRead = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
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
