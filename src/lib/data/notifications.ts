/**
 * Data access layer for notifications.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface GetNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Fetch notifications for a user with optional filters.
 */
export async function getNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
  options: GetNotificationsOptions = {},
) {
  const { limit = 20, unreadOnly = false } = options;

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq("read", false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

/**
 * Mark notifications as read. If `notificationIds` is provided, marks
 * only those; otherwise marks all unread notifications for the user.
 */
export async function markNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
  notificationIds?: string[],
) {
  let query = supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId);

  if (notificationIds && notificationIds.length > 0) {
    query = query.in("id", notificationIds);
  } else {
    query = query.eq("read", false);
  }

  const { error } = await query;
  if (error) throw error;
}

/**
 * Create a notification. Consolidates the scattered insert patterns
 * across route handlers.
 */
export async function createNotification(
  supabase: SupabaseClient,
  payload: {
    user_id: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("notifications").insert(payload);

  if (error) throw error;
}
