import { withAuth } from "@/lib/api/with-auth";
import { apiError, apiSuccess } from "@/lib/errors";

/**
 * GET /api/profiles/search?q=<query>
 * Search profiles by full_name (case-insensitive).
 * Excludes current user. Returns up to 10 results with connection status.
 */
export const GET = withAuth(async (req, { user, supabase }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return apiError("VALIDATION", "Query must be at least 2 characters", 400);
  }

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id, full_name, headline")
    .ilike("full_name", `%${q.trim()}%`)
    .neq("user_id", user.id)
    .limit(10);

  if (error) return apiError("INTERNAL", error.message, 500);

  if (!profiles || profiles.length === 0) {
    return apiSuccess({ profiles: [] });
  }

  // Fetch all existing friendships with these users in one query
  const otherUserIds = profiles.map((p) => p.user_id);

  const { data: friendships } = await supabase
    .from("friendships")
    .select("id, user_id, friend_id, status")
    .or(
      otherUserIds
        .map(
          (id) =>
            `and(user_id.eq.${user.id},friend_id.eq.${id}),and(user_id.eq.${id},friend_id.eq.${user.id})`,
        )
        .join(","),
    );

  const friendshipMap = new Map<
    string,
    { id: string; status: string; user_id: string; friend_id: string }
  >();
  for (const f of friendships ?? []) {
    const otherId = f.user_id === user.id ? f.friend_id : f.user_id;
    friendshipMap.set(otherId, f);
  }

  const enriched = profiles.map((p) => {
    const f = friendshipMap.get(p.user_id);
    let connectionStatus:
      | "none"
      | "pending_sent"
      | "pending_incoming"
      | "accepted" = "none";

    if (f) {
      if (f.status === "accepted") {
        connectionStatus = "accepted";
      } else if (f.status === "pending") {
        connectionStatus =
          f.user_id === user.id ? "pending_sent" : "pending_incoming";
      }
    }

    return { ...p, connectionStatus };
  });

  return apiSuccess({ profiles: enriched });
});
