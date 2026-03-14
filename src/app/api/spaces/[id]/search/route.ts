import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";

/**
 * GET /api/spaces/[id]/search?q=...&limit=20
 * Full-text search of space messages. Requires membership.
 * RLS (including visible_from) enforced via security invoker RPC.
 */
export const GET = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    throw new AppError(
      "VALIDATION",
      "Search query must be at least 2 characters",
      400,
    );
  }

  const limitParam = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(Math.max(limitParam, 1), 50);

  const { data, error } = await supabase.rpc("search_space_messages", {
    target_space_id: spaceId,
    search_query: query,
    result_limit: limit,
  });

  if (error) {
    throw new AppError("INTERNAL", `Search failed: ${error.message}`, 500);
  }

  return apiSuccess({ messages: data ?? [] });
});
