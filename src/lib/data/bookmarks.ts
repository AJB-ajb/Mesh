/**
 * Data access layer for bookmarks.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get all bookmarked posting IDs for a user.
 */
export async function getBookmarkedPostingIds(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("posting_id")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.posting_id);
}

/**
 * Toggle a bookmark for a posting. Returns `true` if the bookmark was
 * created, `false` if it was removed.
 */
export async function toggleBookmark(
  supabase: SupabaseClient,
  userId: string,
  postingId: string,
): Promise<boolean> {
  // Check if bookmark exists
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", userId)
    .eq("posting_id", postingId)
    .maybeSingle();

  if (existing) {
    // Remove bookmark
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", existing.id);
    if (error) throw error;
    return false;
  }

  // Create bookmark
  const { error } = await supabase
    .from("bookmarks")
    .insert({ user_id: userId, posting_id: postingId });
  if (error) throw error;
  return true;
}
