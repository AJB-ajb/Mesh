import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess, parseBody } from "@/lib/errors";

/**
 * GET /api/bookmarks
 * Return the current user's bookmarked posting IDs.
 */
export const GET = withAuth(async (_req, { user, supabase }) => {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("posting_id")
    .eq("user_id", user.id);

  if (error) {
    return apiError("INTERNAL", "Failed to fetch bookmarks", 500);
  }

  return apiSuccess({
    postingIds: data.map((row: { posting_id: string }) => row.posting_id),
  });
});

/**
 * POST /api/bookmarks
 * Toggle a bookmark: insert if not exists, delete if exists.
 * Body: { posting_id: string }
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  const { posting_id } = await parseBody<{ posting_id?: string }>(req);

  if (!posting_id || typeof posting_id !== "string") {
    return apiError("VALIDATION", "posting_id is required", 400);
  }

  // Check if bookmark already exists
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("posting_id", posting_id)
    .maybeSingle();

  if (existing) {
    // Remove bookmark
    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return apiError("INTERNAL", "Failed to remove bookmark", 500);
    }

    return apiSuccess({ bookmarked: false });
  }

  // Add bookmark
  const { error } = await supabase
    .from("bookmarks")
    .insert({ user_id: user.id, posting_id });

  if (error) {
    return apiError("INTERNAL", "Failed to add bookmark", 500);
  }

  return apiSuccess({ bookmarked: true });
});
