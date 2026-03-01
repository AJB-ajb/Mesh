import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check if a posting is fully staffed, and if so mark it as "filled".
 *
 * Counts accepted rows in the given table (applications or matches)
 * filtered by the posting foreign key, fetches the posting's team_size_max,
 * and updates the posting status to "filled" when the count reaches capacity.
 */
export async function markPostingFilledIfFull(
  supabase: SupabaseClient,
  postingId: string,
  countTable: "applications" | "matches",
  countColumn: string,
) {
  // Fetch posting's team_size_max
  const { data: posting } = await supabase
    .from("postings")
    .select("team_size_max")
    .eq("id", postingId)
    .single();

  if (!posting) return;

  const teamSizeMax = posting.team_size_max ?? 1;

  // Count accepted rows
  const { count } = await supabase
    .from(countTable)
    .select("*", { count: "exact", head: true })
    .eq(countColumn, postingId)
    .eq("status", "accepted");

  if (count !== null && count >= teamSizeMax) {
    await supabase
      .from("postings")
      .update({ status: "filled", updated_at: new Date().toISOString() })
      .eq("id", postingId);
  }
}
