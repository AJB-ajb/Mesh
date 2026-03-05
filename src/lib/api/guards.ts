/**
 * Authorization guard utilities for API route handlers.
 *
 * All guards accept a `SupabaseClient` as the first parameter so they
 * can be used inside any `withAuth` handler. They throw `AppError` on
 * failure, which `withAuth` catches and maps to the appropriate HTTP
 * response.
 */

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Re-export existing ownership guard for backward compat
// ---------------------------------------------------------------------------

export { verifyPostingOwnership } from "./ownership";

// ---------------------------------------------------------------------------
// Application ownership
// ---------------------------------------------------------------------------

/**
 * Verify the current user owns an application. Returns the application row.
 * Throws NOT_FOUND if the application doesn't exist, FORBIDDEN if not the
 * applicant.
 */
export async function verifyApplicationOwnership(
  supabase: SupabaseClient,
  applicationId: string,
  userId: string,
) {
  const { data: application, error } = await supabase
    .from("applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (error || !application) {
    throw new AppError("NOT_FOUND", "Application not found", 404);
  }

  if (application.applicant_id !== userId) {
    throw new AppError("FORBIDDEN", "Not your application", 403);
  }

  return application;
}

// ---------------------------------------------------------------------------
// Match participant
// ---------------------------------------------------------------------------

/**
 * Verify the current user is a participant in a match (either the
 * applicant or the posting creator). Returns the match row with joined
 * posting data.
 *
 * Throws NOT_FOUND if the match doesn't exist, FORBIDDEN if the user
 * is neither participant.
 */
export async function verifyMatchParticipant(
  supabase: SupabaseClient,
  matchId: string,
  userId: string,
) {
  const { data: match, error } = await supabase
    .from("matches")
    .select("*, postings(creator_id)")
    .eq("id", matchId)
    .single();

  if (error || !match) {
    throw new AppError("NOT_FOUND", "Match not found", 404);
  }

  const postingCreatorId = (
    match.postings as unknown as { creator_id: string } | null
  )?.creator_id;

  if (match.user_id !== userId && postingCreatorId !== userId) {
    throw new AppError("FORBIDDEN", "Not a participant in this match", 403);
  }

  return match;
}

// ---------------------------------------------------------------------------
// Profile existence
// ---------------------------------------------------------------------------

/**
 * Ensure a profile row exists for the given user. If one doesn't exist,
 * creates a minimal profile from the auth user metadata.
 *
 * Returns the profile row (existing or newly created).
 */
export async function ensureProfileExists(
  supabase: SupabaseClient,
  user: User,
) {
  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return existing;

  const fullName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "User";

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      full_name: fullName,
    })
    .select("*")
    .single();

  if (error) {
    throw new AppError("INTERNAL", "Failed to create profile", 500);
  }

  return created;
}
