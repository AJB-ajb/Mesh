import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

/**
 * Verify the current user owns a posting. Returns the posting row.
 * Throws AppError("NOT_FOUND") or AppError("FORBIDDEN") as appropriate.
 */
export async function verifyPostingOwnership(
  supabase: SupabaseClient,
  postingId: string,
  userId: string,
) {
  const { data: posting, error } = await supabase
    .from("postings")
    .select("*")
    .eq("id", postingId)
    .single();

  if (error || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id !== userId) {
    throw new AppError("FORBIDDEN", "Not your posting", 403);
  }

  return posting;
}
