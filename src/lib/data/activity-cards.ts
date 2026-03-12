/**
 * Data access layer for activity cards.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityCardType,
  ActivityCardStatus,
  Json,
} from "@/lib/supabase/types";

/**
 * Get activity cards for a user, filtered by status.
 */
export async function getCards(
  supabase: SupabaseClient,
  userId: string,
  opts?: { status?: ActivityCardStatus },
) {
  let query = supabase
    .from("activity_cards")
    .select(
      `
      *,
      from_profile:from_user_id(full_name, user_id),
      space_posting:posting_id(text, category, tags, status)
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (opts?.status) {
    query = query.eq("status", opts.status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/**
 * Create an activity card.
 */
export async function createCard(
  supabase: SupabaseClient,
  card: {
    user_id: string;
    type: ActivityCardType;
    space_id?: string | null;
    posting_id?: string | null;
    from_user_id?: string | null;
    data?: Json;
  },
) {
  const { data, error } = await supabase
    .from("activity_cards")
    .insert(card)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update a card's status (act on / dismiss).
 */
export async function updateStatus(
  supabase: SupabaseClient,
  cardId: string,
  status: ActivityCardStatus,
) {
  const update: Record<string, unknown> = { status };
  if (status === "acted") {
    update.acted_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("activity_cards")
    .update(update)
    .eq("id", cardId);

  if (error) throw error;
}

/**
 * Get count of pending activity cards.
 */
export async function getPendingCount(
  supabase: SupabaseClient,
  userId: string,
) {
  const { count, error } = await supabase
    .from("activity_cards")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}
