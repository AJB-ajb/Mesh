/**
 * Data access layer for space members.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get all members of a space with profile info.
 */
export async function getMembers(supabase: SupabaseClient, spaceId: string) {
  const { data, error } = await supabase
    .from("space_members")
    .select("*, profiles:user_id(full_name, headline, user_id)")
    .eq("space_id", spaceId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Add a member to a space.
 */
export async function addMember(
  supabase: SupabaseClient,
  spaceId: string,
  userId: string,
  role: "member" | "admin" = "member",
) {
  const { error } = await supabase.from("space_members").insert({
    space_id: spaceId,
    user_id: userId,
    role,
  });

  if (error) throw error;
}

/**
 * Remove a member from a space.
 */
export async function removeMember(
  supabase: SupabaseClient,
  spaceId: string,
  userId: string,
) {
  const { error } = await supabase
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Update a member's role.
 */
export async function updateRole(
  supabase: SupabaseClient,
  spaceId: string,
  userId: string,
  role: "member" | "admin",
) {
  const { error } = await supabase
    .from("space_members")
    .update({ role })
    .eq("space_id", spaceId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Update the read cursor (marks messages as read).
 */
export async function updateReadCursor(
  supabase: SupabaseClient,
  spaceId: string,
  userId: string,
) {
  const { error } = await supabase
    .from("space_members")
    .update({ last_read_at: new Date().toISOString(), unread_count: 0 })
    .eq("space_id", spaceId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Reset unread count (called when user opens a space).
 */
export async function resetUnread(
  supabase: SupabaseClient,
  spaceId: string,
  userId: string,
) {
  return updateReadCursor(supabase, spaceId, userId);
}

/**
 * Toggle pinned status.
 */
export async function togglePin(
  supabase: SupabaseClient,
  spaceId: string,
  userId: string,
  pinned: boolean,
) {
  const { error } = await supabase
    .from("space_members")
    .update({ pinned })
    .eq("space_id", spaceId)
    .eq("user_id", userId);

  if (error) throw error;
}

/**
 * Toggle muted status.
 */
export async function toggleMute(
  supabase: SupabaseClient,
  spaceId: string,
  userId: string,
  muted: boolean,
) {
  const { error } = await supabase
    .from("space_members")
    .update({ muted })
    .eq("space_id", spaceId)
    .eq("user_id", userId);

  if (error) throw error;
}
