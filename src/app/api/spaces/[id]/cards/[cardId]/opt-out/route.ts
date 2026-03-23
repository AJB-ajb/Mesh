import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";

/**
 * POST /api/spaces/[id]/cards/[cardId]/opt-out
 * Opt out of a card (can't make any / pass).
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;
  const cardId = params.cardId;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const body = await parseBody<{ reason: "cant_make_any" | "pass" }>(req);

  if (!body.reason || !["cant_make_any", "pass"].includes(body.reason)) {
    throw new AppError(
      "VALIDATION",
      "reason must be 'cant_make_any' or 'pass'",
      400,
    );
  }

  const { data, error } = await supabase.rpc("opt_out_card", {
    p_card_id: cardId,
    p_user_id: user.id,
    p_reason: body.reason,
  });

  if (error) {
    throw new AppError("INTERNAL", `Failed to opt out: ${error.message}`, 500);
  }

  return apiSuccess({ data });
});

/**
 * DELETE /api/spaces/[id]/cards/[cardId]/opt-out
 * Undo an opt-out (return to voting).
 */
export const DELETE = withAuth(async (_req, { user, supabase, params }) => {
  const spaceId = params.id;
  const cardId = params.cardId;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const { data, error } = await supabase.rpc("undo_opt_out", {
    p_card_id: cardId,
    p_user_id: user.id,
  });

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to undo opt-out: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ data });
});
