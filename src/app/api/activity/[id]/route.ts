import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import type { ActivityCardStatus } from "@/lib/supabase/types";

/**
 * PATCH /api/activity/[id]
 * Update an activity card (act on it or dismiss it).
 * Only the card owner can update their own cards.
 */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const cardId = params.id;

  // Fetch the card and verify ownership
  const { data: card, error: fetchError } = await supabase
    .from("activity_cards")
    .select("*")
    .eq("id", cardId)
    .single();

  if (fetchError || !card) {
    throw new AppError("NOT_FOUND", "Activity card not found", 404);
  }

  if (card.user_id !== user.id) {
    throw new AppError("FORBIDDEN", "Not your activity card", 403);
  }

  if (card.status !== "pending") {
    throw new AppError(
      "VALIDATION",
      `Cannot update a ${card.status} activity card`,
      400,
    );
  }

  const body = await parseBody<{
    status: ActivityCardStatus;
    action_data?: Record<string, unknown>;
  }>(req);

  if (!["acted", "dismissed"].includes(body.status)) {
    throw new AppError(
      "VALIDATION",
      'Status must be "acted" or "dismissed"',
      400,
    );
  }

  const update: Record<string, unknown> = {
    status: body.status,
  };

  if (body.status === "acted") {
    update.acted_at = new Date().toISOString();
  }

  const { data: updated, error: updateError } = await supabase
    .from("activity_cards")
    .update(update)
    .eq("id", cardId)
    .select()
    .single();

  if (updateError) {
    throw new AppError(
      "INTERNAL",
      `Failed to update activity card: ${updateError.message}`,
      500,
    );
  }

  return apiSuccess({ card: updated });
});
