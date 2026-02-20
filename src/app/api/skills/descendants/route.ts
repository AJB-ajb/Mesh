import { withAuth } from "@/lib/api/with-auth";
import { AppError, apiSuccess } from "@/lib/errors";

/**
 * GET /api/skills/descendants?skill_id=uuid
 * Returns all descendant skill IDs for a given skill node (inclusive).
 * Used by the browse page to resolve tree-aware skill filters.
 */
export const GET = withAuth(async (req, { supabase }) => {
  const { searchParams } = new URL(req.url);
  const skillId = searchParams.get("skill_id");

  if (!skillId) {
    throw new AppError("VALIDATION", "skill_id parameter is required", 400);
  }

  const { data, error } = await supabase.rpc("get_skill_descendants", {
    root_skill_id: skillId,
  });

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to get descendants: ${error.message}`,
      500,
    );
  }

  const descendantIds = (data || []).map((row: { id: string }) => row.id);

  return apiSuccess({ descendantIds });
});
