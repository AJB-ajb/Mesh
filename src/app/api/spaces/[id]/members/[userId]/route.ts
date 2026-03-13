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

  // Prevent removing the last admin
  if (!isSelf) {
    const { data: targetMember } = await supabase
      .from("space_members")
      .select("role")
      .eq("space_id", spaceId)
      .eq("user_id", targetUserId)
      .single();

    if (!targetMember) {
      throw new AppError("NOT_FOUND", "Member not found", 404);
    }
  } else {
    // Check if we're the last admin before leaving
    const { data: selfMember } = await supabase
      .from("space_members")
      .select("role")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .single();

    if (selfMember?.role === "admin") {
      const { count } = await supabase
        .from("space_members")
        .select("*", { count: "exact", head: true })
        .eq("space_id", spaceId)
        .eq("role", "admin");

      if ((count ?? 0) <= 1) {
        throw new AppError(
          "VALIDATION",
          "Cannot leave: you are the last admin. Transfer admin role first.",
          400,
        );
      }
    }
  }

  const { error } = await supabase
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", targetUserId);

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to remove member: ${error.message}`,
      500,
    );
  }

  // Defensive check: verify at least one admin remains after the delete.
  // Guards against TOCTOU race where another admin was removed concurrently.
  const { count: remainingAdmins } = await supabase
    .from("space_members")
    .select("*", { count: "exact", head: true })
    .eq("space_id", spaceId)
    .eq("role", "admin");

  if ((remainingAdmins ?? 0) === 0) {
    // Race condition: re-add as admin
    await supabase.from("space_members").insert({
      space_id: spaceId,
      user_id: targetUserId,
      role: "admin",
    });
    throw new AppError("CONFLICT", "Cannot remove the last admin", 409);
  }

  return apiSuccess({ removed: true });
});
