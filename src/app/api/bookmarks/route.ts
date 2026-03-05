import { withAuth } from "@/lib/api/with-auth";
import { getBookmarkedPostingIds, toggleBookmark } from "@/lib/data";
import { AppError, apiSuccess, parseBody } from "@/lib/errors";

/**
 * GET /api/bookmarks
 * Return the current user's bookmarked posting IDs.
 */
export const GET = withAuth(async (_req, { user, supabase }) => {
  const postingIds = await getBookmarkedPostingIds(supabase, user.id);
  return apiSuccess({ postingIds });
});

/**
 * POST /api/bookmarks
 * Toggle a bookmark: insert if not exists, delete if exists.
 * Body: { posting_id: string }
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  const { posting_id } = await parseBody<{ posting_id?: string }>(req);

  if (!posting_id || typeof posting_id !== "string") {
    throw new AppError("VALIDATION", "posting_id is required", 400);
  }

  const bookmarked = await toggleBookmark(supabase, user.id, posting_id);
  return apiSuccess({ bookmarked });
});
