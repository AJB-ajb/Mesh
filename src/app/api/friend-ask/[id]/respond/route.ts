import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/with-auth";
import { apiError } from "@/lib/errors";

/**
 * POST /api/friend-ask/[id]/respond
 * Respond to a friend-ask (accept or decline).
 * Body: { action: "accept" | "decline" }
 * Only the currently-asked friend can respond.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const { id } = params;

  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("VALIDATION", "Invalid JSON body", 400);
  }

  const { action } = body;

  if (!action || !["accept", "decline"].includes(action)) {
    return apiError("VALIDATION", "action must be 'accept' or 'decline'", 400);
  }

  const { data: friendAsk, error: fetchError } = await supabase
    .from("friend_asks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !friendAsk) {
    return apiError("NOT_FOUND", "Friend-ask not found", 404);
  }

  if (friendAsk.status !== "pending") {
    return apiError(
      "VALIDATION",
      `Cannot respond: friend-ask status is ${friendAsk.status}`,
      400,
    );
  }

  // Verify the user is the current friend being asked
  const currentFriendId =
    friendAsk.ordered_friend_list[friendAsk.current_request_index];

  if (user.id !== currentFriendId) {
    return apiError("FORBIDDEN", "You are not the currently-asked friend", 403);
  }

  if (action === "accept") {
    const { data, error } = await supabase
      .from("friend_asks")
      .update({ status: "accepted" })
      .eq("id", id)
      .select()
      .single();

    if (error) return apiError("INTERNAL", error.message, 500);

    return NextResponse.json({
      friend_ask: data,
      message: "Friend-ask accepted",
    });
  }

  // Decline: auto-advance to next friend
  const nextIndex = friendAsk.current_request_index + 1;

  if (nextIndex >= friendAsk.ordered_friend_list.length) {
    // No more friends to ask
    const { data, error } = await supabase
      .from("friend_asks")
      .update({ status: "completed", current_request_index: nextIndex })
      .eq("id", id)
      .select()
      .single();

    if (error) return apiError("INTERNAL", error.message, 500);

    return NextResponse.json({
      friend_ask: data,
      message: "Declined. No more friends in the list — sequence completed.",
    });
  }

  // Advance to next friend
  const { data, error } = await supabase
    .from("friend_asks")
    .update({ current_request_index: nextIndex })
    .eq("id", id)
    .select()
    .single();

  if (error) return apiError("INTERNAL", error.message, 500);

  return NextResponse.json({
    friend_ask: data,
    message: "Declined. Next friend will be asked.",
    next_friend_id: friendAsk.ordered_friend_list[nextIndex],
  });
});
