import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";

/**
 * POST /api/spaces/[id]/cards/[cardId]/vote
 * Vote on a card option. Uses the atomic vote_on_card RPC.
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

  return apiSuccess({ data });
});
