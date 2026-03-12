import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import {
  verifySpaceMembership,
} from "@/lib/api/space-guards";
import type { InviteMode } from "@/lib/supabase/types";

/**
 * GET /api/spaces/[id]/postings/[pid]/invites
 * List invites for a posting. Only the posting creator or space admin can view.
 */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const spaceId = params.id;
  const postingId = params.pid;

  const membership = await verifySpaceMembership(supabase, spaceId, user.id);

  // Fetch the posting to verify it belongs to this space
  const { data: posting, error: postingError } = await supabase
    .from("space_postings")
    .select("created_by")
    .eq("id", postingId)
    .eq("space_id", spaceId)
    .single();

  if (postingError || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  const isCreator = posting.created_by === user.id;
  const isAdmin = membership.role === "admin";

  if (!isCreator && !isAdmin) {
    throw new AppError(
      "FORBIDDEN",
      "Only the posting creator or a space admin can view invites",
      403,
    );
  }

  const { data: invites, error } = await supabase
    .from("space_invites")
    .select("*")
    .eq("posting_id", postingId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to fetch invites: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ invites: invites ?? [] });
});

/**
 * POST /api/spaces/[id]/postings/[pid]/invites
 * Create an invite batch for a posting.
 * Only the posting creator or a space admin can create invites.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;
  const postingId = params.pid;

  const membership = await verifySpaceMembership(supabase, spaceId, user.id);

  // Fetch the posting
  const { data: posting, error: postingError } = await supabase
    .from("space_postings")
    .select("created_by, status")
    .eq("id", postingId)
    .eq("space_id", spaceId)
    .single();

  if (postingError || !posting) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  const isCreator = posting.created_by === user.id;
  const isAdmin = membership.role === "admin";

  if (!isCreator && !isAdmin) {
    throw new AppError(
      "FORBIDDEN",
      "Only the posting creator or a space admin can create invites",
      403,
    );
  }

  if (posting.status !== "open" && posting.status !== "active") {
    throw new AppError(
      "VALIDATION",
      "Cannot create invites for a closed posting",
      400,
    );
  }

  const body = await parseBody<{
    ordered_list: string[];
    mode?: InviteMode;
    concurrent_max?: number;
  }>(req);

  if (!body.ordered_list || body.ordered_list.length === 0) {
    throw new AppError("VALIDATION", "ordered_list must have at least one user", 400);
  }

  const { data: invite, error: insertError } = await supabase
    .from("space_invites")
    .insert({
      posting_id: postingId,
      created_by: user.id,
      mode: body.mode ?? "parallel",
      ordered_list: body.ordered_list,
      current_index: 0,
      concurrent_max: body.concurrent_max ?? body.ordered_list.length,
      pending: body.mode === "sequential"
        ? body.ordered_list.slice(0, body.concurrent_max ?? 1)
        : body.ordered_list,
      declined: [],
      status: "active",
    })
    .select()
    .single();

  if (insertError) {
    throw new AppError(
      "INTERNAL",
      `Failed to create invite: ${insertError.message}`,
      500,
    );
  }

  // Create activity cards for invited users
  const pendingUsers = invite.pending as string[];
  if (pendingUsers.length > 0) {
    const activityCards = pendingUsers.map((invitedUserId: string) => ({
      user_id: invitedUserId,
      type: "invite" as const,
      space_id: spaceId,
      posting_id: postingId,
      from_user_id: user.id,
      data: { invite_id: invite.id },
      status: "pending" as const,
    }));

    await supabase.from("activity_cards").insert(activityCards);
  }

  return apiSuccess({ invite }, 201);
});
