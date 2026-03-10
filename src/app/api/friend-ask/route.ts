import { withAuth } from "@/lib/api/with-auth";
import { verifyPostingOwnership } from "@/lib/api/guards";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";

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

  if (error) throw new AppError("INTERNAL", error.message, 500);

  return apiSuccess({ friend_asks: data });
});

/**
 * POST /api/friend-ask
 * Create an invite for a posting (sequential or parallel).
 * Body: { posting_id: string, ordered_friend_list: string[], invite_mode?: "sequential" | "parallel", concurrent_invites?: number }
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  const { posting_id, ordered_friend_list, invite_mode, concurrent_invites } =
    await parseBody<{
      posting_id?: string;
      ordered_friend_list?: string[];
      invite_mode?: string;
      concurrent_invites?: number;
    }>(req);

  if (!posting_id) {
    throw new AppError("VALIDATION", "posting_id is required", 400);
  }

  if (
    !ordered_friend_list ||
    !Array.isArray(ordered_friend_list) ||
    ordered_friend_list.length === 0
  ) {
    throw new AppError(
      "VALIDATION",
      "ordered_friend_list must be a non-empty array of user IDs",
      400,
    );
  }

  // Validate invite_mode if provided
  const resolvedInviteMode = invite_mode || "sequential";
  if (!["sequential", "parallel"].includes(resolvedInviteMode)) {
    throw new AppError(
      "VALIDATION",
      "invite_mode must be 'sequential' or 'parallel'",
      400,
    );
  }

  // Validate concurrent_invites if provided
  const resolvedConcurrentInvites = concurrent_invites ?? 1;
  if (
    !Number.isInteger(resolvedConcurrentInvites) ||
    resolvedConcurrentInvites < 1 ||
    resolvedConcurrentInvites > ordered_friend_list.length
  ) {
    throw new AppError(
      "VALIDATION",
      `concurrent_invites must be a positive integer, max ${ordered_friend_list.length}`,
      400,
    );
  }

  // Verify the posting exists and belongs to the user
  await verifyPostingOwnership(supabase, posting_id, user.id);

  // Check for an existing active invite on this posting
  const { data: existing } = await supabase
    .from("friend_asks")
    .select("id")
    .eq("posting_id", posting_id)
    .in("status", ["pending", "accepted"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    throw new AppError(
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
      concurrent_invites: resolvedConcurrentInvites,
    })
    .select()
    .single();

  if (error) throw new AppError("INTERNAL", error.message, 500);

  return apiSuccess({ friend_ask: data }, 201);
});
