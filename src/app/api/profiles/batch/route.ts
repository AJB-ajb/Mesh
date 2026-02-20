import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess, parseBody } from "@/lib/errors";

/**
 * POST /api/profiles/batch
 * Fetch basic profile info for a batch of user IDs.
 * Body: { user_ids: string[] }
 * Returns: { profiles: { user_id, full_name }[] }
 */
export const POST = withAuth(async (req, { supabase }) => {
  const { user_ids } = await parseBody<{ user_ids?: string[] }>(req);

  if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
    return apiError("VALIDATION", "user_ids must be a non-empty array", 400);
  }

  if (user_ids.length > 50) {
    return apiError("VALIDATION", "Maximum 50 user IDs per request", 400);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", user_ids);

  if (error) return apiError("INTERNAL", error.message, 500);

  return apiSuccess({ profiles: data ?? [] });
});
