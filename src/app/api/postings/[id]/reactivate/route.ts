import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

/**
 * PATCH /api/postings/[id]/reactivate
 * Reactivate an expired posting: sets status to 'open' and extends expires_at by 90 days.
 * Only the posting creator can reactivate.
 */
export const PATCH = withAuth(async (_req, { user, supabase, params }) => {
  const postingId = params.id;

  const { data: posting, error: fetchError } = await supabase
    .from("postings")
    .select("id, creator_id, status, expires_at")
    .eq("id", postingId)
    .single();

  if (fetchError || !posting) {
    return apiError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id !== user.id) {
    return apiError(
      "FORBIDDEN",
      "Only the posting creator can reactivate",
      403,
    );
  }

  const isExpired =
    posting.expires_at && new Date(posting.expires_at) < new Date();
  if (posting.status !== "expired" && !isExpired) {
    return apiError(
      "VALIDATION",
      "Posting is not expired and cannot be reactivated",
      400,
    );
  }

  const newExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const { data: updated, error: updateError } = await supabase
    .from("postings")
    .update({
      status: "open",
      expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", postingId)
    .select()
    .single();

  if (updateError || !updated) {
    return apiError("INTERNAL", "Failed to reactivate posting", 500);
  }

  return NextResponse.json({ posting: updated });
});
