import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";

/**
 * POST /api/friend-ask/respond-by-posting
 * Convenience route that resolves a friend_ask by posting_id,
 * then delegates to the main respond logic via internal fetch.
 *
 * Used by the notifications dropdown which only has related_posting_id.
 * Body: { postingId: string, action: "accept" | "decline" }
 */
export const POST = withAuth(async (req, { user, supabase }) => {
  const { postingId, action } = await parseBody<{
    postingId?: string;
    action?: string;
  }>(req);

  if (!postingId || typeof postingId !== "string") {
    throw new AppError("VALIDATION", "postingId is required", 400);
  }

  if (!action || !["accept", "decline"].includes(action)) {
    throw new AppError(
      "VALIDATION",
      "action must be 'accept' or 'decline'",
      400,
    );
  }

  // Find a pending friend_ask for this posting where the user is an invitee
  const { data: friendAsks, error: fetchError } = await supabase
    .from("friend_asks")
    .select(
      "id, invite_mode, pending_invitees, ordered_friend_list, declined_list",
    )
    .eq("posting_id", postingId)
    .eq("status", "pending");

  if (fetchError) {
    throw new AppError("INTERNAL", fetchError.message, 500);
  }

  // Find the friend_ask where this user is an active invitee
  let matchedFriendAskId: string | null = null;

  for (const fa of friendAsks ?? []) {
    const inviteMode = fa.invite_mode ?? "sequential";
    const declinedList: string[] = fa.declined_list ?? [];

    if (declinedList.includes(user.id)) continue;

    if (inviteMode === "parallel") {
      if (fa.ordered_friend_list.includes(user.id)) {
        matchedFriendAskId = fa.id;
        break;
      }
    } else {
      const pendingInvitees: string[] = fa.pending_invitees ?? [];
      if (pendingInvitees.includes(user.id)) {
        matchedFriendAskId = fa.id;
        break;
      }
    }
  }

  if (!matchedFriendAskId) {
    throw new AppError(
      "NOT_FOUND",
      "No pending invite found for this posting",
      404,
    );
  }

  // Forward to the main respond route via internal fetch
  const respondUrl = new URL(
    `/api/friend-ask/${matchedFriendAskId}/respond`,
    req.url,
  );

  const response = await fetch(respondUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify({ action }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new AppError(
      data.error?.code || "INTERNAL",
      data.error?.message || "Failed to respond to invite",
      response.status,
    );
  }

  return apiSuccess(data);
});
