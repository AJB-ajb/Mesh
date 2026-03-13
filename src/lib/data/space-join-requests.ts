/**
 * Data access layer for space join requests.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { JoinRequestStatus } from "@/lib/supabase/types";

/**
 * Create a join request for a posting.
 */
export async function createJoinRequest(
  supabase: SupabaseClient,
  postingId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("space_join_requests")
    .insert({ posting_id: postingId, user_id: userId })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all join requests for a posting (for the posting creator).
 */
export async function getForPosting(
  supabase: SupabaseClient,
  postingId: string,
) {
  const { data, error } = await supabase
    .from("space_join_requests")
    .select("*, profiles:user_id(full_name, headline, user_id)")
    .eq("posting_id", postingId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Update a join request status.
 */
export async function updateStatus(
  supabase: SupabaseClient,
  requestId: string,
  status: JoinRequestStatus,
) {
  const { error } = await supabase
    .from("space_join_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) throw error;
}

/**
 * Get a user's join request for a specific posting.
 */
export async function getForUser(
  supabase: SupabaseClient,
  postingId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("space_join_requests")
    .select("*")
    .eq("posting_id", postingId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
