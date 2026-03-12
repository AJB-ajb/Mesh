import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import type { SpaceInsert, SpaceListItem } from "@/lib/supabase/types";

/**
 * GET /api/spaces
 * List spaces the authenticated user is a member of.
 * Returns spaces ordered by pinned first, then most recent message.
 */
export const GET = withAuth(async (req, { user, supabase }) => {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const offset = Number(searchParams.get("offset") || 0);

  // Fetch spaces where the user is a member, with membership details
  const { data: spaces, error } = await supabase
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

  if (error) {
    throw new AppError("INTERNAL", `Failed to fetch spaces: ${error.message}`, 500);
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
    if (insertError.code === "23503") {
      throw new AppError(
        "VALIDATION",
        "Parent space not found",
        400,
      );
    }
    throw new AppError(
      "INTERNAL",
      `Failed to create space: ${insertError.message}`,
      500,
    );
  }

  // Add creator as admin member
  const { error: memberError } = await supabase
    .from("space_members")
    .insert({
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
