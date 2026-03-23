import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import type {
  SpaceCardType,
  SpaceCardData,
  SpaceCard,
  CardOption,
} from "@/lib/supabase/types";
import { checkAutoResolve } from "@/lib/cards/auto-resolve";

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

  // On-read deadline check: auto-resolve active cards whose deadline has passed
  const now = new Date();
  const expiredCards = (cards ?? []).filter(
    (c) => c.status === "active" && c.deadline && new Date(c.deadline) <= now,
  );

  // Hoist member count query — only fetch once if there are expired cards
  let memberCount = 0;
  if (expiredCards.length > 0) {
    const { count } = await supabase
      .from("space_members")
      .select("*", { count: "exact", head: true })
      .eq("space_id", spaceId);
    memberCount = count ?? 0;
  }

  const resolvedCards: typeof cards = [];
  for (const card of cards ?? []) {
    if (expiredCards.some((e) => e.id === card.id)) {
      const cardData = card.data as Record<string, unknown>;
      const options = (cardData.options ?? []) as CardOption[];
      const maxVotes = Math.max(...options.map((o) => o.votes.length), 0);
      const quorum = (cardData.quorum as number) ?? null;

      const hasVotes = maxVotes > 0;
      const quorumMet = quorum == null || maxVotes >= quorum;

      if (!hasVotes || !quorumMet) {
        // No votes or quorum not met → cancel
        const { data: updated } = await supabase
          .from("space_cards")
          .update({ status: "cancelled" })
          .eq("id", card.id)
          .select("*")
          .single();
        resolvedCards.push(updated ?? { ...card, status: "cancelled" });
      } else {
        // Resolve normally
        const result = checkAutoResolve(card as SpaceCard, memberCount);
        const resolvedData = result.resolvedData
          ? { ...card.data, ...result.resolvedData }
          : card.data;

        const { data: updated } = await supabase
          .from("space_cards")
          .update({ status: "resolved", data: resolvedData })
          .eq("id", card.id)
          .select("*")
          .single();

        resolvedCards.push(
          updated ?? { ...card, status: "resolved", data: resolvedData },
        );
      }
    } else {
      resolvedCards.push(card);
    }
  }

  // Strip member_notes to only the requesting user's note (privacy)
  const sanitizedCards = (resolvedCards ?? []).map((card) => {
    const data = card.data as Record<string, unknown>;
    if (data?.member_notes && typeof data.member_notes === "object") {
      const allNotes = data.member_notes as Record<string, string>;
      const myNote = allNotes[user.id];
      return {
        ...card,
        data: {
          ...data,
          member_notes: myNote ? { [user.id]: myNote } : null,
        },
      };
    }
    return card;
  });

  return apiSuccess({ cards: sanitizedCards });
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
    deadline?: string | null;
  }>(req);

  if (!body.type || !body.data) {
    throw new AppError("VALIDATION", "type and data are required", 400);
  }

  // Compute deadline: use provided value, or fall back to type-based defaults
  let deadline: string | null;
  if (body.deadline !== undefined) {
    deadline = body.deadline;
  } else {
    deadline = getDefaultDeadline(body.type);
  }

  // Create the card
  const { data: card, error: cardError } = await supabase
    .from("space_cards")
    .insert({
      space_id: spaceId,
      created_by: user.id,
      type: body.type,
      data: body.data,
      deadline,
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

/** Default deadline offsets per card type (in hours). null = no deadline. */
function getDefaultDeadline(type: SpaceCardType): string | null {
  const hoursMap: Record<SpaceCardType, number | null> = {
    time_proposal: 12,
    rsvp: 24,
    poll: 24,
    task_claim: null,
    location: 24,
  };
  const hours = hoursMap[type];
  if (hours == null) return null;
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

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
