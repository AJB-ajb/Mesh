import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

/**
 * GET /api/friend-ask
 * List friend-ask sequences created by the authenticated user.
 */
export const GET = withAuth(async (_req, { user, supabase }) => {
  const { data, error } = await supabase
    .from("friend_asks")
    .select("*, posting:postings(id, title, status)")
    .eq("creator_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return apiError("INTERNAL", error.message, 500);

  return NextResponse.json({ friend_asks: data });
});

/**
 * POST /api/friend-ask
 * Create a friend-ask sequence for a posting.
 * Body: { posting_id: string, ordered_friend_list: string[] }
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  let body: { posting_id?: string; ordered_friend_list?: string[] };
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION", "Invalid JSON body", 400);
  }

  const { posting_id, ordered_friend_list } = body;

  if (!posting_id) {
    return apiError("VALIDATION", "posting_id is required", 400);
  }

  if (
    !ordered_friend_list ||
    !Array.isArray(ordered_friend_list) ||
    ordered_friend_list.length === 0
  ) {
    return apiError(
      "VALIDATION",
      "ordered_friend_list must be a non-empty array of user IDs",
      400,
    );
  }

  // Verify the posting exists and belongs to the user
  const { data: posting, error: postingError } = await supabase
    .from("postings")
    .select("id, creator_id, mode")
    .eq("id", posting_id)
    .single();

  if (postingError || !posting) {
    return apiError("NOT_FOUND", "Posting not found", 404);
  }

  if (posting.creator_id !== user.id) {
    return apiError(
      "FORBIDDEN",
      "You can only create friend-asks for your own postings",
      403,
    );
  }

  // Set the posting mode to friend_ask
  if (posting.mode !== "friend_ask") {
    await supabase
      .from("postings")
      .update({ mode: "friend_ask" })
      .eq("id", posting_id);
  }

  // Check for an existing active friend-ask on this posting
  const { data: existing } = await supabase
    .from("friend_asks")
    .select("id")
    .eq("posting_id", posting_id)
    .in("status", ["pending", "accepted"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    return apiError(
      "CONFLICT",
      "An active friend-ask already exists for this posting",
      409,
    );
  }

  const { data, error } = await supabase
    .from("friend_asks")
    .insert({
      posting_id,
      creator_id: user.id,
      ordered_friend_list,
    })
    .select()
    .single();

  if (error) return apiError("INTERNAL", error.message, 500);

  return NextResponse.json({ friend_ask: data }, { status: 201 });
});
