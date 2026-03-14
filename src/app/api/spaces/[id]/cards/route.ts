import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import type { SpaceCardType, SpaceCardData } from "@/lib/supabase/types";

/**
 * GET /api/spaces/[id]/cards
 * Fetch active cards for a space. Requires membership.
 */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  // Fetch all cards (not just active) so resolved/cancelled cards
  // still render in the timeline alongside their messages
  const { data: cards, error } = await supabase
    .from("space_cards")
    .select("*")
    .eq("space_id", spaceId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new AppError(
      "INTERNAL",
      `Failed to fetch cards: ${error.message}`,
      500,
    );
  }

  return apiSuccess({ cards: cards ?? [] });
});

/**
 * POST /api/spaces/[id]/cards
 * Create a new card + its corresponding message. Requires membership.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const body = await parseBody<{
    type: SpaceCardType;
    data: SpaceCardData;
  }>(req);

  if (!body.type || !body.data) {
    throw new AppError("VALIDATION", "type and data are required", 400);
  }

  // Create the card
  const { data: card, error: cardError } = await supabase
    .from("space_cards")
    .insert({
      space_id: spaceId,
      created_by: user.id,
      type: body.type,
      data: body.data,
    })
    .select("*")
    .single();

  if (cardError) {
    throw new AppError(
      "INTERNAL",
      `Failed to create card: ${cardError.message}`,
      500,
    );
  }

  // Create a message of type "card" referencing the card
  const contentPreview = getCardContentPreview(body.type, body.data);
  const { data: message, error: msgError } = await supabase
    .from("space_messages")
    .insert({
      space_id: spaceId,
      sender_id: user.id,
      type: "card",
      card_id: card.id,
      content: contentPreview,
    })
    .select("*")
    .single();

  if (msgError) {
    // Clean up orphaned card
    await supabase.from("space_cards").delete().eq("id", card.id);
    throw new AppError(
      "INTERNAL",
      `Failed to create card message: ${msgError.message}`,
      500,
    );
  }

  // Back-link message to card
  const { error: linkError } = await supabase
    .from("space_cards")
    .update({ message_id: message.id })
    .eq("id", card.id);

  if (linkError) {
    console.error("[cards] Failed to back-link message to card:", linkError);
  }

  // Update space's updated_at
  await supabase
    .from("spaces")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", spaceId);

  return apiSuccess({ card: { ...card, message_id: message.id } }, 201);
});

/** Generate a short text preview for the card message */
function getCardContentPreview(
  type: SpaceCardType,
  data: SpaceCardData,
): string {
  switch (type) {
    case "poll":
      return `Poll: ${(data as { question: string }).question}`;
    case "time_proposal":
      return `Time proposal: ${(data as { title: string }).title}`;
    case "rsvp":
      return `RSVP: ${(data as { title: string }).title}`;
    case "task_claim":
      return `Task: ${(data as { description: string }).description}`;
    case "location":
      return `Location: ${(data as { label: string }).label}`;
    default:
      return "Card";
  }
}
