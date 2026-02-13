"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationData = {
  unreadCount: number;
  userInitials: string;
  userId: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractInitials(fullName: string | null | undefined): string {
  if (!fullName) return "U";
  return fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

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

  const [{ data: profile }, { count }] = await Promise.all([
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
  ]);

  return {
    userInitials: extractInitials(profile?.full_name),
    unreadCount: count || 0,
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

  return {
    unreadCount: data?.unreadCount ?? 0,
    userInitials: data?.userInitials ?? "U",
    isLoading,
    error,
  };
}
