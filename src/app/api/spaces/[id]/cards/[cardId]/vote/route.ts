import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import { checkAutoResolve } from "@/lib/cards/auto-resolve";
import { createEventsForResolvedCard } from "@/lib/cards/calendar-integration";
import type { SpaceCard } from "@/lib/supabase/types";

/**
 * POST /api/spaces/[id]/cards/[cardId]/vote
 * Vote on a card option. Uses the atomic vote_on_card RPC.
 * After voting, checks if the card should auto-resolve.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;
  const cardId = params.cardId;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const body = await parseBody<{ option_index: number }>(req);

  if (typeof body.option_index !== "number" || body.option_index < 0) {
    throw new AppError(
      "VALIDATION",
      "option_index must be a non-negative integer",
      400,
    );
  }

  const { data, error } = await supabase.rpc("vote_on_card", {
    p_card_id: cardId,
    p_user_id: user.id,
    p_option_index: body.option_index,
  });

  if (error) {
    throw new AppError("INTERNAL", `Failed to vote: ${error.message}`, 500);
  }

  // Check for auto-resolve after successful vote
  const [cardResult, memberCountResult] = await Promise.all([
    supabase.from("space_cards").select("*").eq("id", cardId).single(),
    supabase
      .from("space_members")
      .select("user_id", { count: "exact", head: true })
      .eq("space_id", spaceId),
  ]);

  if (cardResult.data && cardResult.data.status === "active") {
    const card = cardResult.data as SpaceCard;
    const memberCount = memberCountResult.count ?? 0;
    const { shouldResolve, resolvedData } = checkAutoResolve(card, memberCount);

    if (shouldResolve) {
      const newData = { ...card.data, ...(resolvedData ?? {}) };
      await supabase
        .from("space_cards")
        .update({ status: "resolved", data: newData })
        .eq("id", cardId);

      // Fire-and-forget calendar event creation for time proposals
      if (card.type === "time_proposal" && resolvedData?.resolved_slot) {
        const resolvedCard = {
          ...card,
          data: newData,
          status: "resolved" as const,
        };
        createEventsForResolvedCard(resolvedCard, spaceId).catch((err) =>
          console.error("[vote/auto-resolve] Calendar creation failed:", err),
        );
      }
    }
  }

  return apiSuccess({ data });
});
