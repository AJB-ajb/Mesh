import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import type { SpaceCard, SpaceCardStatus } from "@/lib/supabase/types";
import { createEventsForResolvedCard } from "@/lib/cards/calendar-integration";

/**
 * PATCH /api/spaces/[id]/cards/[cardId]
 * Update card status (resolve, cancel). Requires membership.
 * Only the card creator or a space admin can resolve/cancel.
 */
export const PATCH = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;
  const cardId = params.cardId;

  const member = await verifySpaceMembership(supabase, spaceId, user.id);

  const body = await parseBody<{
    status: SpaceCardStatus;
    resolved_data?: Record<string, unknown>;
  }>(req);

  if (!body.status || !["resolved", "cancelled"].includes(body.status)) {
    throw new AppError(
      "VALIDATION",
      "status must be 'resolved' or 'cancelled'",
      400,
    );
  }

  // Fetch the card to verify ownership
  const { data: card, error: fetchError } = await supabase
    .from("space_cards")
    .select("*")
    .eq("id", cardId)
    .eq("space_id", spaceId)
    .single();

  if (fetchError || !card) {
    throw new AppError("NOT_FOUND", "Card not found", 404);
  }

  if (card.status !== "active") {
    throw new AppError("VALIDATION", "Card is not active", 400);
  }

  // Only creator or admin can resolve/cancel
  if (card.created_by !== user.id && member.role !== "admin") {
    throw new AppError(
      "FORBIDDEN",
      "Only the card creator or a space admin can update card status",
      403,
    );
  }

  // Merge any resolved_data into existing data
  const updatedData = body.resolved_data
    ? { ...card.data, ...body.resolved_data }
    : card.data;

  const { data: updated, error: updateError } = await supabase
    .from("space_cards")
    .update({ status: body.status, data: updatedData })
    .eq("id", cardId)
    .select("*")
    .single();

  if (updateError) {
    throw new AppError(
      "INTERNAL",
      `Failed to update card: ${updateError.message}`,
      500,
    );
  }

  // Fire-and-forget: create calendar events for resolved time proposals
  if (
    body.status === "resolved" &&
    updated.type === "time_proposal" &&
    (updated.data as Record<string, unknown>).resolved_slot
  ) {
    createEventsForResolvedCard(updated as SpaceCard, spaceId).catch((err) => {
      console.error("[cards/PATCH] Calendar event creation failed:", err);
    });
  }

  // Chained card flow: after resolving a time_proposal, suggest a location
  // card if the space has no active location cards.
  let follow_up_suggestion = null;
  if (body.status === "resolved" && updated.type === "time_proposal") {
    const { data: activeLocationCards } = await supabase
      .from("space_cards")
      .select("id")
      .eq("space_id", spaceId)
      .eq("type", "location")
      .eq("status", "active")
      .limit(1);

    if (!activeLocationCards || activeLocationCards.length === 0) {
      follow_up_suggestion = {
        suggested_type: "location" as const,
        confidence: 0.8,
        reason: "Time\u2019s set \u2014 pick a meeting place?",
        prefill: {},
      };
    }
  }

  return apiSuccess({ card: updated, follow_up_suggestion });
});
