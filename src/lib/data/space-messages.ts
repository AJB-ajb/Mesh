/**
 * Data access layer for space messages.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpaceMessageInsert } from "@/lib/supabase/types";

const PAGE_SIZE = 50;

/**
 * Fetch paginated messages for a space, newest first.
 *
 * `visible_from` enforcement: the `space_messages_select` RLS policy filters
 * messages to only those created at or after the member's `visible_from`
 * timestamp. All client queries go through Supabase with RLS, so no
 * additional application-level filtering is needed.
 */
export async function getMessages(
  supabase: SupabaseClient,
  spaceId: string,
  opts?: { before?: string; limit?: number },
) {
  const limit = opts?.limit ?? PAGE_SIZE;

  let query = supabase
    .from("space_messages")
    .select("*, profiles:sender_id(full_name, user_id)")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts?.before) {
    query = query.lt("created_at", opts.before);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Return in chronological order (oldest first) for display
  return (data ?? []).reverse();
}

/**
 * Create a new message.
 */
export async function createMessage(
  supabase: SupabaseClient,
  data: SpaceMessageInsert,
) {
  const { data: row, error } = await supabase
    .from("space_messages")
    .insert(data)
    .select("*, profiles:sender_id(full_name, user_id)")
    .single();

  if (error) throw error;
  return row;
}

/**
 * Get the latest message for a space (for previews).
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
