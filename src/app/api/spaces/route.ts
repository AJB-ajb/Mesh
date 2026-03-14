import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import { PG_FOREIGN_KEY_VIOLATION } from "@/lib/api/pg-error-codes";
import { parsePaginationParams } from "@/lib/api/pagination";
import type { SpaceInsert, SpaceListItem } from "@/lib/supabase/types";

/**
 * GET /api/spaces
 * List spaces the authenticated user is a member of.
 * Returns spaces ordered by pinned first, then most recent message.
 */
export const GET = withAuth(async (req, { user, supabase }) => {
  const { searchParams } = new URL(req.url);
  const { limit, offset } = parsePaginationParams(searchParams, {
    limit: 50,
    max: 100,
  });
  const archived = searchParams.get("archived");

  // Fetch spaces where the user is a member, with membership details
  let query = supabase
    .from("spaces")
    .select(
      `
      *,
      space_members!inner (
        unread_count,
        pinned,
        muted,
        role,
        pin_order
      )
    `,
    )
    .eq("space_members.user_id", user.id)
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by archive status
  if (archived === "true") {
    query = query.not("archived_at", "is", null);
  } else if (archived !== "all") {
    // Default: show only active (non-archived) spaces
    query = query.is("archived_at", null);
  }

  const { data: spaces, error } = await query;

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to fetch spaces: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ spaces: (spaces ?? []) as SpaceListItem[] });
});

/**
 * POST /api/spaces
 * Create a new space. The creator is automatically added as admin.
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  const body = await parseBody<{
    name?: string | null;
    state_text?: string | null;
    parent_space_id?: string | null;
    settings?: SpaceInsert["settings"];
  }>(req);

  if (body.parent_space_id) {
    await verifySpaceMembership(supabase, body.parent_space_id, user.id);
  }

  const { data: space, error: insertError } = await supabase
    .from("spaces")
    .insert({
      name: body.name ?? null,
      state_text: body.state_text ?? null,
      parent_space_id: body.parent_space_id ?? null,
      created_by: user.id,
      settings: body.settings ?? {},
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new AppError("VALIDATION", "Parent space not found", 400);
    }
    throw new AppError(
      "INTERNAL",
      `Failed to create space: ${insertError.message}`,
      500,
    );
  }

  // Add creator as admin member
  const { error: memberError } = await supabase.from("space_members").insert({
    space_id: space.id,
    user_id: user.id,
    role: "admin",
  });

  if (memberError) {
    // Rollback space creation on membership failure
    await supabase.from("spaces").delete().eq("id", space.id);
    throw new AppError(
      "INTERNAL",
      `Failed to add creator as member: ${memberError.message}`,
      500,
    );
  }

  return apiSuccess({ space }, 201);
});
