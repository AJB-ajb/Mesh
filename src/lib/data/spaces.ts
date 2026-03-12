/**
 * Data access layer for spaces.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpaceInsert, SpaceUpdate } from "@/lib/supabase/types";
import { GLOBAL_SPACE_ID } from "@/lib/supabase/types";

/**
 * Fetch a single space by ID. Returns null if not found.
 */
export async function getSpace(supabase: SupabaseClient, spaceId: string) {
  const { data, error } = await supabase
    .from("spaces")
    .select("*")
    .eq("id", spaceId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw error;
  return data;
}

/**
 * Fetch all spaces for the current user (via their memberships),
 * including last message preview and membership info.
 */
export async function getUserSpaces(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("spaces")
    .select(
      `
      *,
      space_members!inner(user_id, unread_count, pinned, muted, role)
    `,
    )
    .eq("space_members.user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Fetch the Global Space (Explore).
 */
export async function getGlobalSpace(supabase: SupabaseClient) {
  return getSpace(supabase, GLOBAL_SPACE_ID);
}

/**
 * Create a new space. Returns the created row.
 */
export async function createSpace(
  supabase: SupabaseClient,
  data: SpaceInsert,
) {
  const { data: row, error } = await supabase
    .from("spaces")
    .insert(data)
    .select("*")
    .single();

  if (error) throw error;
  return row;
}

/**
 * Update a space by ID.
 */
export async function updateSpace(
  supabase: SupabaseClient,
  spaceId: string,
  data: SpaceUpdate,
) {
  const { error } = await supabase
    .from("spaces")
    .update(data)
    .eq("id", spaceId);

  if (error) throw error;
}

/**
 * Get the latest message for a space (for list previews).
 */
export async function getLatestMessage(
  supabase: SupabaseClient,
  spaceId: string,
) {
  const { data, error } = await supabase
    .from("space_messages")
    .select("id, content, type, created_at, sender_id")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get member count for a space.
 */
export async function getMemberCount(
  supabase: SupabaseClient,
  spaceId: string,
) {
  const { count, error } = await supabase
    .from("space_members")
    .select("*", { count: "exact", head: true })
    .eq("space_id", spaceId);

  if (error) throw error;
  return count ?? 0;
}
