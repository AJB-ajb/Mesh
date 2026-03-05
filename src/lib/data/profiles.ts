/**
 * Data access layer for profiles.
 *
 * All functions accept `supabase: SupabaseClient` as first parameter
 * so they work in both server routes and client hooks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotificationPreferences } from "@/lib/notifications/preferences";

/**
 * Fetch a single profile by user ID. Returns null if not found.
 */
export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  // PGRST116 = no rows returned
  if (error?.code === "PGRST116") return null;
  if (error) throw error;

  return data;
}

/**
 * Get the timezone for a user, defaulting to "UTC" if not set.
 */
export async function getProfileTimezone(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("user_id", userId)
    .single();

  return data?.timezone ?? "UTC";
}

/**
 * Get notification preferences for a user.
 */
export async function getNotificationPreferences(
  supabase: SupabaseClient,
  userId: string,
): Promise<NotificationPreferences | null> {
  const { data } = await supabase
    .from("profiles")
    .select("notification_preferences")
    .eq("user_id", userId)
    .single();

  return (data?.notification_preferences as NotificationPreferences) ?? null;
}

/**
 * Batch-fetch profiles by user IDs.
 */
export async function batchGetProfiles(
  supabase: SupabaseClient,
  userIds: string[],
  columns: string = "*",
) {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(columns)
    .in("user_id", userIds);

  if (error) throw error;
  return data ?? [];
}

/**
 * Update specific fields on a profile row.
 */
export async function updateProfileFields(
  supabase: SupabaseClient,
  userId: string,
  fields: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("user_id", userId);

  if (error) throw error;
}
