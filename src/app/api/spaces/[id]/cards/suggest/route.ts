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
    messages?: { sender_name: string; content: string }[];
    message?: string;
  }>(req);

  // Accept either a messages array or a single message string
  let recentMessages: { sender_name: string; content: string }[];
  if (body.messages && body.messages.length > 0) {
    recentMessages = body.messages.slice(-10);
  } else if (body.message) {
    // Fetch recent messages from the space for context
    const { data: dbMessages } = await supabase
      .from("space_messages")
      .select("content, sender_id")
      .eq("space_id", spaceId)
      .eq("type", "message")
      .order("created_at", { ascending: false })
      .limit(5);

    const senderIds = [
      ...new Set((dbMessages ?? []).map((m) => m.sender_id).filter(Boolean)),
    ];
    const nameMap = new Map<string, string>();
    if (senderIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", senderIds);
      for (const p of profiles ?? []) {
        if (p.full_name) nameMap.set(p.user_id, p.full_name);
      }
    }

    recentMessages = (dbMessages ?? [])
      .reverse()
      .map((m) => ({
        sender_name: nameMap.get(m.sender_id!) ?? "User",
        content: m.content ?? "",
      }))
      .filter((m) => m.content);
  } else {
    throw new AppError(
      "VALIDATION",
      "messages array or message is required",
      400,
    );
  }

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
