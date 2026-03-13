/**
 * Authorization guards for Space-related API routes.
 *
 * Each guard accepts a SupabaseClient so it can be used inside any
 * `withAuth` handler. They throw AppError on failure, which `withAuth`
 * catches and maps to the appropriate HTTP response.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "@/lib/errors";

/**
 * Verify the current user is a member of the given space.
 * Returns the space_members row.
 * Throws FORBIDDEN if not a member.
 */
export async function verifySpaceMembership(
  supabase: SupabaseClient,
  spaceId: string,
  userId: string,
) {
  const { data: member, error } = await supabase
    .from("space_members")
    .select("*")
    .eq("space_id", spaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !member) {
    throw new AppError("FORBIDDEN", "You are not a member of this space", 403);
  }

  return member;
}

/**
 * Verify the current user is an admin of the given space.
 * Returns the space_members row.
 * Throws FORBIDDEN if not a member or not an admin.
 */
export async function verifySpaceAdmin(
  supabase: SupabaseClient,
  spaceId: string,
  userId: string,
) {
  const member = await verifySpaceMembership(supabase, spaceId, userId);

  if (member.role !== "admin") {
    throw new AppError(
      "FORBIDDEN",
      "Only space admins can perform this action",
      403,
    );
  }

  return member;
}

/**
 * Verify the current user is the creator of a space posting.
 * Returns the space_postings row.
 * Throws NOT_FOUND if posting doesn't exist, FORBIDDEN if not the creator.
 */
export async function verifySpacePostingOwnership(
  supabase: SupabaseClient,
  postingId: string,
  userId: string,
) {
  const { data: posting, error } = await supabase
    .from("space_postings")
    .select("*")
    .eq("id", postingId)
    .single();

  if (error || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.created_by !== userId) {
    throw new AppError("FORBIDDEN", "Not your posting", 403);
  }

  return posting;
}
