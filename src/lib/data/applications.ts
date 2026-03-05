/**
 * Data access layer for applications (join requests).
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch a single application by ID.
 */
export async function getApplication(
  supabase: SupabaseClient,
  applicationId: string,
) {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw error;

  return data;
}

/**
 * Fetch a user's application for a specific posting (maybeSingle).
 * Returns null if the user hasn't applied.
 */
export async function getApplicationForPosting(
  supabase: SupabaseClient,
  postingId: string,
  applicantId: string,
) {
  const { data, error } = await supabase
    .from("applications")
    .select("*")
    .eq("posting_id", postingId)
    .eq("applicant_id", applicantId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Insert a new application. Returns the inserted row.
 */
export async function createApplication(
  supabase: SupabaseClient,
  data: Record<string, unknown>,
) {
  const { data: row, error } = await supabase
    .from("applications")
    .insert(data)
    .select("*")
    .single();

  if (error) throw error;
  return row;
}

/**
 * Update the status of an application.
 */
export async function updateApplicationStatus(
  supabase: SupabaseClient,
  applicationId: string,
  status: string,
) {
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId);

  if (error) throw error;
}

/**
 * Count applications for a posting filtered by status.
 */
export async function countApplicationsByStatus(
  supabase: SupabaseClient,
  postingId: string,
  status: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("applications")
    .select("*", { count: "exact", head: true })
    .eq("posting_id", postingId)
    .eq("status", status);

  if (error) throw error;
  return count ?? 0;
}
