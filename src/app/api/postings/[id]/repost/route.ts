import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

/**
 * POST /api/postings/[id]/repost
 * Repost an expired posting: resets to open, clears all join requests,
 * and bumps the posting to the top of the feed via reposted_at.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const postingId = params.id;

  const body = await req.json().catch(() => ({}));
  const days = body.days as number | undefined;
  const expiresAtRaw = body.expires_at as string | undefined;

  // Compute new expires_at
  let newExpiresAt: Date;
  if (expiresAtRaw) {
    newExpiresAt = new Date(expiresAtRaw);
    if (isNaN(newExpiresAt.getTime())) {
      return apiError("VALIDATION", "Invalid expires_at date", 400);
    }
    if (newExpiresAt <= new Date()) {
      return apiError("VALIDATION", "New deadline must be in the future", 400);
    }
  } else {
    const daysToExtend = days && days > 0 ? days : 7;
    newExpiresAt = new Date(Date.now() + daysToExtend * 24 * 60 * 60 * 1000);
  }

  const { data: posting, error: fetchError } = await supabase
    .from("postings")
    .select("id, creator_id, status, expires_at")
    .eq("id", postingId)
    .single();

  if (fetchError || !posting) {
    return apiError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id !== user.id) {
    return apiError("FORBIDDEN", "Only the posting creator can repost", 403);
  }

  const isExpired =
    posting.expires_at && new Date(posting.expires_at) < new Date();
  if (posting.status !== "expired" && !isExpired) {
    return apiError("VALIDATION", "Posting is not expired", 400);
  }

  // Delete all existing applications/join requests for this posting
  const { error: deleteError } = await supabase
    .from("applications")
    .delete()
    .eq("posting_id", postingId);

  if (deleteError) {
    return apiError("INTERNAL", "Failed to clear join requests", 500);
  }

  // Update posting: reset status, set new deadline, bump via reposted_at
  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("postings")
    .update({
      status: "open",
      expires_at: newExpiresAt.toISOString(),
      reposted_at: now,
      updated_at: now,
    })
    .eq("id", postingId)
    .select()
    .single();

  if (updateError || !updated) {
    return apiError("INTERNAL", "Failed to repost", 500);
  }

  return NextResponse.json({ posting: updated });
});
