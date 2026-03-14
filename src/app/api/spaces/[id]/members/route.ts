import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import {
  verifySpaceMembership,
  verifySpaceAdmin,
} from "@/lib/api/space-guards";
import { PG_FOREIGN_KEY_VIOLATION } from "@/lib/api/pg-error-codes";

/**
 * GET /api/spaces/[id]/members
 * List members of a space. Requires membership.
 */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const { data: members, error } = await supabase
    .from("space_members")
    .select(
      `
      *,
      profiles:user_id (full_name, user_id, headline, bio)
    `,
    )
    .eq("space_id", spaceId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to fetch members: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ members: members ?? [] });
});

/**
 * POST /api/spaces/[id]/members
 * Add a member to a space. Requires admin role.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceAdmin(supabase, spaceId, user.id);

  const body = await parseBody<{
    user_id: string;
    role?: "member" | "admin";
  }>(req);

  if (!body.user_id) {
    throw new AppError("VALIDATION", "user_id is required", 400);
  }

  // Check if user is already a member
  const { data: existing } = await supabase
    .from("space_members")
    .select("user_id")
    .eq("space_id", spaceId)
    .eq("user_id", body.user_id)
    .maybeSingle();

  if (existing) {
    throw new AppError(
      "CONFLICT",
      "User is already a member of this space",
      409,
    );
  }

  const { data: member, error } = await supabase
    .from("space_members")
    .insert({
      space_id: spaceId,
      user_id: body.user_id,
      role: body.role ?? "member",
    })
    .select(
      `
      *,
      profiles:user_id (full_name, user_id)
    `,
    )
    .single();

  if (error) {
    if (error.code === PG_FOREIGN_KEY_VIOLATION) {
      throw new AppError("VALIDATION", "User not found", 400);
    }
    throw new AppError(
      "INTERNAL",
      `Failed to add member: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ member }, 201);
});
