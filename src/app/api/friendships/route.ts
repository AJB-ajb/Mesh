import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

/**
 * GET /api/friendships
 * List all friendships for the authenticated user (both directions).
 */
export const GET = withAuth(async (_req, { user, supabase }) => {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      "*, friend:profiles!friendships_friend_id_fkey(user_id, full_name, headline), user:profiles!friendships_user_id_fkey(user_id, full_name, headline)",
    )
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (error) return apiError("INTERNAL", error.message, 500);

  return NextResponse.json({ friendships: data });
});

/**
 * POST /api/friendships
 * Send a friendship request. Body: { friend_id: string }
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  let body: { friend_id?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION", "Invalid JSON body", 400);
  }

  const { friend_id } = body;

  if (!friend_id) {
    return apiError("VALIDATION", "friend_id is required", 400);
  }

  if (friend_id === user.id) {
    return apiError(
      "VALIDATION",
      "Cannot send a friend request to yourself",
      400,
    );
  }

  // Check if a friendship already exists in either direction
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${friend_id}),and(user_id.eq.${friend_id},friend_id.eq.${user.id})`,
    )
    .limit(1)
    .maybeSingle();

  if (existing) {
    return apiError(
      "CONFLICT",
      `Friendship already exists (status: ${existing.status})`,
      409,
    );
  }

  const { data, error } = await supabase
    .from("friendships")
    .insert({ user_id: user.id, friend_id })
    .select()
    .single();

  if (error) return apiError("INTERNAL", error.message, 500);

  return NextResponse.json({ friendship: data }, { status: 201 });
});
