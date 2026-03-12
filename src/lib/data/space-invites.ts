/**
 * Data access layer for space invites.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { InviteMode } from "@/lib/supabase/types";

/**
 * Create an invite flow for a posting.
 */
export async function createInvite(
  supabase: SupabaseClient,
  postingId: string,
  createdBy: string,
  orderedList: string[],
  mode: InviteMode = "sequential",
  concurrentMax: number = 1,
) {
  const { data, error } = await supabase
    .from("space_invites")
    .insert({
      posting_id: postingId,
      created_by: createdBy,
      mode,
      ordered_list: orderedList,
      concurrent_max: concurrentMax,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get active invites for a posting.
 */
export async function getActive(
  supabase: SupabaseClient,
  postingId: string,
) {
  const { data, error } = await supabase
    .from("space_invites")
    .select("*")
    .eq("posting_id", postingId)
    .eq("status", "active");

  if (error) throw error;
  return data ?? [];
}

/**
 * Advance a sequential invite to the next person.
 */
export async function advance(
  supabase: SupabaseClient,
  inviteId: string,
  newIndex: number,
  pending: string[],
) {
  const { error } = await supabase
    .from("space_invites")
    .update({ current_index: newIndex, pending })
    .eq("id", inviteId);

  if (error) throw error;
}

/**
 * Record a response (accept/decline) to an invite.
 */
export async function respond(
  supabase: SupabaseClient,
  inviteId: string,
  userId: string,
  accepted: boolean,
  currentPending: string[],
  currentDeclined: string[],
) {
  const newPending = currentPending.filter((id) => id !== userId);
  const newDeclined = accepted
    ? currentDeclined
    : [...currentDeclined, userId];

  const { error } = await supabase
    .from("space_invites")
    .update({ pending: newPending, declined: newDeclined })
    .eq("id", inviteId);

  if (error) throw error;
}
