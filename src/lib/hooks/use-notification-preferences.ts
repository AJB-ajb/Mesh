import { useCallback } from "react";
import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import {
  type NotificationPreferences,
  defaultNotificationPreferences,
} from "@/lib/notifications/preferences";

async function fetchNotificationPreferences(): Promise<NotificationPreferences> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("user_id", user.id)
    .single();

  if (error || !data) {
    return defaultNotificationPreferences;
  }

  return (
    (data.notification_preferences as NotificationPreferences) ??
    defaultNotificationPreferences
  );
}

export function useNotificationPreferences() {
  const { data, error, isLoading, mutate } = useSWR(
    "notification-preferences",
    fetchNotificationPreferences,
  );

  const preferences = data ?? defaultNotificationPreferences;

  const updatePreferences = useCallback(
    async (prefs: NotificationPreferences) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Not authenticated");
      }

      // Optimistic update
      mutate(prefs, false);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ notification_preferences: prefs as unknown as Record<string, unknown> })
        .eq("user_id", user.id);

      if (updateError) {
        // Revert on error
        await mutate();
        throw updateError;
      }

      await mutate();
    },
    [mutate],
  );

  return {
    preferences,
    updatePreferences,
    error,
    isLoading,
    mutate,
  };
}
