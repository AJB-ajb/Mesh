/**
 * Data access layer for space postings (posting-messages).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpacePostingInsert, SpacePostingUpdate } from "@/lib/supabase/types";

/**
 * Fetch a single posting by ID.
 */
export async function getPosting(supabase: SupabaseClient, postingId: string) {
  const { data, error } = await supabase
    .from("space_postings")
    .select("*, profiles:created_by(full_name, user_id)")
    .eq("id", postingId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw error;
  return data;
}

/**
 * Fetch all postings in a space.
 */
export async function getPostings(
  supabase: SupabaseClient,
  spaceId: string,
  opts?: { status?: string },
) {
  let query = supabase
    .from("space_postings")
    .select("*, profiles:created_by(full_name, user_id)")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: false });

  if (opts?.status) {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Create a new posting.
 */
export async function createPosting(
  supabase: SupabaseClient,
  data: SpacePostingInsert,
) {
  const { data: row, error } = await supabase
    .from("space_postings")
    .insert(data)
    .select("*, profiles:created_by(full_name, user_id)")
    .single();

  if (error) throw error;
  return row;
}

/**
 * Update a posting.
 */
export async function updatePosting(
  supabase: SupabaseClient,
  postingId: string,
  data: SpacePostingUpdate,
) {
  const { error } = await supabase
    .from("space_postings")
    .update(data)
    .eq("id", postingId);

  if (error) throw error;
}
