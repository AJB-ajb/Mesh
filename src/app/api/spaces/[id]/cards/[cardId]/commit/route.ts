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

  // Use atomic RPC to avoid read-modify-write races
  const { data, error } = await supabase.rpc("commit_to_card", {
    p_card_id: cardId,
    p_user_id: user.id,
    p_commitment: body.commitment,
  });

  if (error) {
    throw new AppError("INTERNAL", `Failed to commit: ${error.message}`, 500);
  }

  // Fire-and-forget: create calendar event for attending/maybe
  if (body.commitment === "attending" || body.commitment === "maybe") {
    // Re-fetch the card for calendar integration (needs full data)
    const { data: card } = await supabase
      .from("space_cards")
      .select("*")
      .eq("id", cardId)
      .single();

    if (card) {
      createEventForUser(
        card as SpaceCard,
        spaceId,
        user.id,
        body.commitment === "maybe",
      ).catch((err) =>
        console.error("[commit] Calendar event creation failed:", err),
      );
    }
  }

  return apiSuccess({ commitment: body.commitment, data });
});
