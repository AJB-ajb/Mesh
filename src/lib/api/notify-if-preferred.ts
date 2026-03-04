import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type NotificationPreferences,
  type NotificationType,
  shouldNotify,
} from "@/lib/notifications/preferences";
import { sendNotification } from "@/lib/notifications/create";

interface NotifyPayload {
  userId: string;
  type: string;
  title: string;
  body: string;
  relatedPostingId?: string;
  relatedApplicationId?: string;
  relatedUserId?: string;
}

/**
 * Send a notification only if the recipient's preferences allow it.
 *
 * Fetches the recipient's notification_preferences from their profile,
 * checks shouldNotify() for the in_app channel, and if allowed, fires
 * sendNotification() (fire-and-forget).
 */
export async function notifyIfPreferred(
  supabase: SupabaseClient,
  recipientId: string,
  notificationType: NotificationType,
  payload: NotifyPayload,
): Promise<void> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("user_id", recipientId)
    .single();

  const prefs =
    profile?.notification_preferences as NotificationPreferences | null;

  if (shouldNotify(prefs, notificationType, "in_app")) {
    sendNotification(payload, supabase);
  }
}
