import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import {
  verifySpaceMembership,
  verifySpaceAdmin,
} from "@/lib/api/space-guards";
import type { SpaceUpdate } from "@/lib/supabase/types";

/**
 * GET /api/spaces/[id]
 * Get space details. Requires membership.
 */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const { data: space, error } = await supabase
    .from("spaces")
    .select(
      `
      *,
      space_members (
        user_id,
        role,
        joined_at,
        muted,
        pinned,
        unread_count,
        last_read_at,
        profiles:user_id (full_name, user_id)
      )
    `,
    )
    .eq("id", spaceId)
    .single();

  if (error || !space) {
    throw new AppError("NOT_FOUND", "Space not found", 404);
  }

  return apiSuccess({ space });
});

/**
 * PATCH /api/spaces/[id]
 * Update space details. Requires admin role.
 */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceAdmin(supabase, spaceId, user.id);

  const body = await parseBody<SpaceUpdate & { archived?: boolean }>(req);

  // Handle archive/unarchive via RPC
  if (body.archived !== undefined) {
    const rpc = body.archived ? "archive_space" : "unarchive_space";
    const { error: archiveError } = await supabase.rpc(rpc, {
      p_space_id: spaceId,
    });
    if (archiveError) {
      throw new AppError(
        "INTERNAL",
        `Failed to ${body.archived ? "archive" : "unarchive"} space: ${archiveError.message}`,
        500,
      );
    }
    // If only archiving, return early
    if (Object.keys(body).length === 1) {
      const { data: updated } = await supabase
        .from("spaces")
        .select()
        .eq("id", spaceId)
        .single();
      return apiSuccess({ space: updated });
    }
  }

  // Only allow known updatable fields
  const update: SpaceUpdate = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.state_text !== undefined) update.state_text = body.state_text;
  if (body.settings !== undefined) update.settings = body.settings;
  if (body.inherits_members !== undefined)
    update.inherits_members = body.inherits_members;

  const { data: space, error } = await supabase
    .from("spaces")
    .update(update)
    .eq("id", spaceId)
    .select()
    .single();

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to update space: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ space });
});

/**
 * DELETE /api/spaces/[id]
 * Delete a space. Requires admin role.
 * Cannot delete global spaces.
 */
export const DELETE = withAuth(async (_req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceAdmin(supabase, spaceId, user.id);

  // Fetch the space to check if it's global
  const { data: space, error: fetchError } = await supabase
    .from("spaces")
    .select("id, is_global")
    .eq("id", spaceId)
    .single();

  if (fetchError || !space) {
    throw new AppError("NOT_FOUND", "Space not found", 404);
  }

  if (space.is_global) {
    throw new AppError("FORBIDDEN", "Cannot delete the global space", 403);
  }

  const { error: deleteError } = await supabase
    .from("spaces")
    .delete()
    .eq("id", spaceId);

  if (deleteError) {
    throw new AppError(
      "INTERNAL",
      `Failed to delete space: ${deleteError.message}`,
      500,
    );
  }

  return apiSuccess({ deleted: true });
});
