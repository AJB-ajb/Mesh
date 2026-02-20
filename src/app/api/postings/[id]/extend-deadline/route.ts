import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";
import { DEADLINES } from "@/lib/constants";

/**
 * PATCH /api/postings/[id]/extend-deadline
 * Extend the deadline of an expired posting.
 * Accepts { days: number } or { expires_at: string }.
 * Keeps all existing join requests intact.
 */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
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
    const daysToExtend =
      days && days > 0 ? days : DEADLINES.DEFAULT_EXTENSION_DAYS;
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
    return apiError(
      "FORBIDDEN",
      "Only the posting creator can extend the deadline",
      403,
    );
  }

  const isExpired =
    posting.expires_at && new Date(posting.expires_at) < new Date();
  if (posting.status !== "expired" && !isExpired) {
    return apiError("VALIDATION", "Posting is not expired", 400);
  }

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
    return apiError("INTERNAL", "Failed to extend deadline", 500);
  }

  return NextResponse.json({ posting: updated });
});
