import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import { detectCardIntent } from "@/lib/ai/card-detection";

/**
 * POST /api/spaces/[id]/cards/suggest
 * Analyze recent messages and suggest a card type.
 * Uses fast (flash-lite) model for low latency.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const body = await parseBody<{
    messages: { sender_name: string; content: string }[];
  }>(req);

  if (!body.messages || body.messages.length === 0) {
    throw new AppError("VALIDATION", "messages array is required", 400);
  }

  // Limit to last 10 messages to keep token count low
  const recentMessages = body.messages.slice(-10);

  // Scope guard: check active card count (max 2)
  const { count } = await supabase
    .from("space_cards")
    .select("id", { count: "exact", head: true })
    .eq("space_id", spaceId)
    .eq("status", "active");

  if ((count ?? 0) >= 2) {
    return apiSuccess({ suggestion: null, reason: "max_active_cards" });
  }

  // Scope guard: in large spaces (>10 members), only admins can trigger
  const { count: memberCount } = await supabase
    .from("space_members")
    .select("user_id", { count: "exact", head: true })
    .eq("space_id", spaceId);

  if ((memberCount ?? 0) > 10) {
    const { data: member } = await supabase
      .from("space_members")
      .select("role")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .single();

    if (member?.role !== "admin") {
      return apiSuccess({ suggestion: null, reason: "admin_only" });
    }
  }

  const result = await detectCardIntent(recentMessages);

  // Only return suggestions with sufficient confidence
  if (!result.suggested_type || result.confidence < 0.6) {
    return apiSuccess({ suggestion: null, reason: "low_confidence" });
  }

  return apiSuccess({ suggestion: result });
});
