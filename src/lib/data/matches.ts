/**
 * Data access layer for matches.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch a single match by ID with joined posting and profile data.
 */
export async function getMatch(supabase: SupabaseClient, matchId: string) {
  const { data, error } = await supabase
    .from("matches")
    .select("*, postings(*, profiles:creator_id(full_name, headline, user_id))")
    .eq("id", matchId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw error;

  return data;
}

/**
 * Fetch all matches for a user (as applicant or posting owner).
 */
export async function getMatchesForUser(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("matches")
    .select("*, postings(*, profiles:creator_id(full_name, headline, user_id))")
    .or(`user_id.eq.${userId},postings.creator_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Update match status and optional extra fields.
 */
export async function updateMatchStatus(
  supabase: SupabaseClient,
  matchId: string,
  status: string,
  extra?: Record<string, unknown>,
) {
  const { error } = await supabase
    .from("matches")
    .update({ status, ...extra })
    .eq("id", matchId);

  if (error) throw error;
}
