/**
 * Data access layer for postings.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch a single posting by ID. Returns null if not found.
 */
export async function getPosting(supabase: SupabaseClient, postingId: string) {
  const { data, error } = await supabase
    .from("postings")
    .select("*")
    .eq("id", postingId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw error;

  return data;
}

/**
 * Fetch a posting with its creator profile joined.
 */
export async function getPostingWithCreator(
  supabase: SupabaseClient,
  postingId: string,
) {
  const { data, error } = await supabase
    .from("postings")
    .select("*, profiles:creator_id(full_name, headline, user_id)")
    .eq("id", postingId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw error;

  return data;
}

/**
 * Insert a new posting row. Returns the inserted row.
 */
export async function createPosting(
  supabase: SupabaseClient,
  data: Record<string, unknown>,
) {
  const { data: row, error } = await supabase
    .from("postings")
    .insert(data)
    .select("*")
    .single();

  if (error) throw error;
  return row;
}

/**
 * Update a posting by ID.
 */
export async function updatePosting(
  supabase: SupabaseClient,
  postingId: string,
  data: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("postings")
    .update(data)
    .eq("id", postingId);

  if (error) throw error;
}
