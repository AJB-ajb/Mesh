import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import {
  verifySpaceMembership,
  verifySpacePostingOwnership,
} from "@/lib/api/space-guards";
import type { SpacePostingUpdate } from "@/lib/supabase/types";

/**
 * PATCH /api/spaces/[id]/postings/[pid]
 * Update a posting. Only the creator or a space admin can update.
 */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;
  const postingId = params.pid;

  // Verify membership first
  const membership = await verifySpaceMembership(supabase, spaceId, user.id);

  // Check ownership or admin
  const { data: existing, error: fetchError } = await supabase
    .from("space_postings")
    .select("*")
    .eq("id", postingId)
    .eq("space_id", spaceId)
    .single();

  if (fetchError || !existing) {
    throw new AppError("NOT_FOUND", "Posting not found", 404);
  }

  const isCreator = existing.created_by === user.id;
  const isAdmin = membership.role === "admin";

  if (!isCreator && !isAdmin) {
    throw new AppError(
      "FORBIDDEN",
      "Only the posting creator or a space admin can update this posting",
      403,
    );
  }

  const body = await parseBody<SpacePostingUpdate>(req);

  // Build update object with only allowed fields
  const update: SpacePostingUpdate = {};
  if (body.text !== undefined) update.text = body.text;
  if (body.category !== undefined) update.category = body.category;
  if (body.tags !== undefined) update.tags = body.tags;
  if (body.capacity !== undefined) update.capacity = body.capacity;
  if (body.team_size_min !== undefined)
    update.team_size_min = body.team_size_min;
  if (body.deadline !== undefined) update.deadline = body.deadline;
  if (body.activity_date !== undefined)
    update.activity_date = body.activity_date;
  if (body.visibility !== undefined) update.visibility = body.visibility;
  if (body.auto_accept !== undefined) update.auto_accept = body.auto_accept;
  if (body.status !== undefined) update.status = body.status;
  if (body.extracted_metadata !== undefined)
    update.extracted_metadata = body.extracted_metadata;

  if (Object.keys(update).length === 0) {
    throw new AppError("VALIDATION", "No fields to update", 400);
  }

  const { data: posting, error } = await supabase
    .from("space_postings")
    .update(update)
    .eq("id", postingId)
    .select(
      `
      *,
      profiles:created_by (full_name, user_id)
    `,
    )
    .single();

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to update posting: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ posting });
});
