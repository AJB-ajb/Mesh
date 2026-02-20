import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess, parseBody } from "@/lib/errors";

/**
 * GET /api/friend-ask
 * List invite sequences created by the authenticated user.
 */
export const GET = withAuth(async (_req, { user, supabase }) => {
  const { data, error } = await supabase
    .from("friend_asks")
    .select("*, posting:postings(id, title, status)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return apiError("INTERNAL", error.message, 500);

  return apiSuccess({ friend_asks: data });
});

/**
 * POST /api/friend-ask
 * Create an invite for a posting (sequential or parallel).
 * Body: { posting_id: string, ordered_friend_list: string[], invite_mode?: "sequential" | "parallel" }
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  const { posting_id, ordered_friend_list, invite_mode } = await parseBody<{
    posting_id?: string;
    ordered_friend_list?: string[];
    invite_mode?: string;
  }>(req);

  if (!posting_id) {
    return apiError("VALIDATION", "posting_id is required", 400);
  }

  if (
    !ordered_friend_list ||
    !Array.isArray(ordered_friend_list) ||
    ordered_friend_list.length === 0
  ) {
    return apiError(
      "VALIDATION",
      "ordered_friend_list must be a non-empty array of user IDs",
      400,
    );
  }

  // Validate invite_mode if provided
  const resolvedInviteMode = invite_mode || "sequential";
  if (!["sequential", "parallel"].includes(resolvedInviteMode)) {
    return apiError(
      "VALIDATION",
      "invite_mode must be 'sequential' or 'parallel'",
      400,
    );
  }

  // Verify the posting exists and belongs to the user
  const { data: posting, error: postingError } = await supabase
    .from("postings")
    .select("id, creator_id")
    .eq("id", posting_id)
    .single();

  if (postingError || !posting) {
    return apiError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id !== user.id) {
    return apiError(
      "FORBIDDEN",
      "You can only create invites for your own postings",
      403,
    );
  }

  // Check for an existing active invite on this posting
  const { data: existing } = await supabase
    .from("friend_asks")
    .select("id")
    .eq("posting_id", posting_id)
    .in("status", ["pending", "accepted"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    return apiError(
      "CONFLICT",
      "An active invite already exists for this posting",
      409,
    );
  }

  const { data, error } = await supabase
    .from("friend_asks")
    .insert({
      posting_id,
      creator_id: user.id,
      ordered_friend_list,
      invite_mode: resolvedInviteMode,
    })
    .select()
    .single();

  if (error) return apiError("INTERNAL", error.message, 500);

  return apiSuccess({ friend_ask: data }, 201);
});
