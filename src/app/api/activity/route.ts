import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError } from "@/lib/errors";
import { parsePaginationParams } from "@/lib/api/pagination";

/**
 * GET /api/activity
 * Fetch the authenticated user's activity cards.
 * Supports filtering by status and type, with pagination.
 */
export const GET = withAuth(async (req, { user, supabase }) => {
  const { searchParams } = new URL(req.url);
  const { limit, offset } = parsePaginationParams(searchParams, {
    limit: 20,
    max: 50,
  });
  const status = searchParams.get("status"); // e.g. "pending"
  const type = searchParams.get("type"); // e.g. "invite", "join_request"

  let query = supabase
    .from("activity_cards")
    .select(
      `
      *,
      from_profile:from_user_id (full_name, user_id),
      space_posting:posting_id (text, category, tags, status)
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq("status", status);
  }

  if (type) {
    query = query.eq("type", type);
  }

  const { data: cards, error } = await query;

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to fetch activity cards: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ cards: cards ?? [] });
});
