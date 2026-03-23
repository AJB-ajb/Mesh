import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Generic ownership verification
// ---------------------------------------------------------------------------

interface VerifyOwnershipOptions {
  /** Supabase table name */
  table: string;
  /** Column that holds the owner's user ID (e.g. "creator_id", "applicant_id") */
  ownerColumn: string;
  /** Human-readable entity label for error messages (e.g. "Posting") */
  entityLabel: string;
}

/**
 * Generic helper: fetch a row by ID, throw NOT_FOUND if missing, throw
 * FORBIDDEN if the owner column doesn't match the given userId.
 *
 * Returns the full row on success.
 */
export async function verifyOwnership(
  supabase: SupabaseClient,
  entityId: string,
  userId: string,
  opts: VerifyOwnershipOptions,
) {
  const { data: row, error } = await supabase
    .from(opts.table)
    .select("*")
    .eq("id", entityId)
    .single();

  if (error || !row) {
    throw new AppError("NOT_FOUND", `${opts.entityLabel} not found`, 404);
  }

  if ((row as Record<string, unknown>)[opts.ownerColumn] !== userId) {
    throw new AppError(
      "FORBIDDEN",
      `Not your ${opts.entityLabel.toLowerCase()}`,
      403,
    );
  }

  return row;
}

// ---------------------------------------------------------------------------
// Thin wrappers (backward-compatible)
// ---------------------------------------------------------------------------

/**
 * Verify the current user owns a posting. Returns the posting row.
 * Throws AppError("NOT_FOUND") or AppError("FORBIDDEN") as appropriate.
 */
export async function verifyPostingOwnership(
  supabase: SupabaseClient,
  postingId: string,
  userId: string,
) {
  return verifyOwnership(supabase, postingId, userId, {
    table: "postings",
    ownerColumn: "creator_id",
    entityLabel: "Posting",
  });
}
