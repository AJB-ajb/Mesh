import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import type { SpaceCard } from "@/lib/supabase/types";
import { createEventForUser } from "@/lib/cards/calendar-integration";

/**
 * POST /api/spaces/[id]/cards/[cardId]/commit
 * Commit to a resolved time proposal (attending / maybe / can't make it).
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;
  const cardId = params.cardId;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const body = await parseBody<{
    commitment: "attending" | "maybe" | "cant_make_it";
  }>(req);

  if (
    !body.commitment ||
    !["attending", "maybe", "cant_make_it"].includes(body.commitment)
  ) {
    throw new AppError(
      "VALIDATION",
      "commitment must be 'attending', 'maybe', or 'cant_make_it'",
      400,
    );
  }

  // Fetch the card
  const { data: card, error: fetchError } = await supabase
    .from("space_cards")
    .select("*")
    .eq("id", cardId)
    .eq("space_id", spaceId)
    .single();

  if (fetchError || !card) {
    throw new AppError("NOT_FOUND", "Card not found", 404);
  }

  if (card.status !== "resolved") {
    throw new AppError("VALIDATION", "Card is not resolved", 400);
  }

  if (card.type !== "time_proposal") {
    throw new AppError(
      "VALIDATION",
      "Commitments only apply to time proposals",
      400,
    );
  }

  // Update commitments in card data
  const currentData = card.data as Record<string, unknown>;
  const commitments = (currentData.commitments as Record<string, string>) ?? {};
  commitments[user.id] = body.commitment;

  const { error: updateError } = await supabase
    .from("space_cards")
    .update({
      data: { ...currentData, commitments },
    })
    .eq("id", cardId);

  if (updateError) {
    throw new AppError(
      "INTERNAL",
      `Failed to update commitment: ${updateError.message}`,
      500,
    );
  }

  // Fire-and-forget: create calendar event for attending/maybe
  if (body.commitment === "attending" || body.commitment === "maybe") {
    createEventForUser(
      card as SpaceCard,
      spaceId,
      user.id,
      body.commitment === "maybe",
    ).catch((err) =>
      console.error("[commit] Calendar event creation failed:", err),
    );
  }

  return apiSuccess({ commitment: body.commitment });
});
