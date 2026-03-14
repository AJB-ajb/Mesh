import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import {
  verifySpaceMembership,
  verifySpaceAdmin,
} from "@/lib/api/space-guards";

/**
 * PATCH /api/spaces/[id]/members/[userId]
 * Update a member's role, muted, pinned, or last_read_at.
 *
 * - Role changes require admin.
 * - muted/pinned/last_read_at can be changed by the member themselves.
 */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;
  const targetUserId = params.userId;

  const body = await parseBody<{
    role?: "member" | "admin";
    muted?: boolean;
    pinned?: boolean;
    last_read_at?: string;
  }>(req);

  // Self-service fields: muted, pinned, last_read_at
  const isSelf = targetUserId === user.id;

  if (body.role !== undefined) {
    // Role changes require admin
    await verifySpaceAdmin(supabase, spaceId, user.id);
  } else if (!isSelf) {
    // Non-role changes to another user also require admin
    await verifySpaceAdmin(supabase, spaceId, user.id);
  } else {
    // Self-service — just verify membership
    await verifySpaceMembership(supabase, spaceId, user.id);
  }

  // Verify target user is a member of this space
  const { data: targetMember } = await supabase
    .from("space_members")
    .select("user_id")
    .eq("space_id", spaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (!targetMember) {
    throw new AppError("NOT_FOUND", "User is not a member of this space", 404);
  }

  const update: Record<string, unknown> = {};
  if (body.role !== undefined) update.role = body.role;
  if (body.muted !== undefined) update.muted = body.muted;
  if (body.pinned !== undefined) update.pinned = body.pinned;
  if (body.last_read_at !== undefined) {
    update.last_read_at = body.last_read_at;
    update.unread_count = 0;
  }

  if (Object.keys(update).length === 0) {
    throw new AppError("VALIDATION", "No fields to update", 400);
  }

  const { data: member, error } = await supabase
    .from("space_members")
    .update(update)
    .eq("space_id", spaceId)
    .eq("user_id", targetUserId)
    .select(
      `
      *,
      profiles:user_id (full_name, user_id)
    `,
    )
    .single();

  if (error) {
    // The DB trigger prevents demoting the last admin
    if (error.code === "23514" || error.message?.includes("last admin")) {
      throw new AppError(
        "VALIDATION",
        "Cannot demote the last admin. Promote another member first.",
        400,
      );
    }
    throw new AppError(
      "INTERNAL",
      `Failed to update member: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ member });
});

/**
 * DELETE /api/spaces/[id]/members/[userId]
 * Remove a member from a space.
 * - Admins can remove anyone.
 * - Members can remove themselves (leave).
 */
export const DELETE = withAuth(async (_req, { user, supabase, params }) => {
  const spaceId = params.id;
  const targetUserId = params.userId;

  const isSelf = targetUserId === user.id;

  if (!isSelf) {
    // Removing another user requires admin
    await verifySpaceAdmin(supabase, spaceId, user.id);
  } else {
    // Leaving — just verify membership
    await verifySpaceMembership(supabase, spaceId, user.id);
  }

  // The DB trigger `trg_prevent_last_admin_removal` atomically prevents
  // removing or demoting the last admin, avoiding TOCTOU races.
  const { error } = await supabase
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", targetUserId);

  if (error) {
    // The trigger raises check_violation when the last admin would be removed
    if (error.code === "23514" || error.message?.includes("last admin")) {
      throw new AppError(
        "VALIDATION",
        "Cannot remove the last admin. Transfer the admin role first.",
        400,
      );
    }
    throw new AppError(
      "INTERNAL",
      `Failed to remove member: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ removed: true });
});
