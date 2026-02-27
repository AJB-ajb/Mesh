import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

/**
 * Sync join table rows: delete existing rows by parent ID, then insert new rows.
 * Used for profile_skills, posting_skills, availability_windows, etc.
 */
export async function syncJoinTableRows<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: string,
  parentColumn: string,
  parentId: string,
  rows: T[],
) {
  // Delete existing
  const { error: deleteError } = await supabase
    .from(table)
    .delete()
    .eq(parentColumn, parentId);

  if (deleteError) {
    throw new AppError(
      "INTERNAL",
      `Failed to clear ${table}: ${deleteError.message}`,
      500,
    );
  }

  if (rows.length === 0) return;

  // Insert new
  const { error: insertError } = await supabase.from(table).insert(rows);

  if (insertError) {
    throw new AppError(
      "INTERNAL",
      `Failed to insert ${table}: ${insertError.message}`,
      500,
    );
  }
}
