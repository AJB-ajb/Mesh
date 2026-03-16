import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { PERSONAS } from "@/lib/bots/personas";
import {
  generateReply,
  decideCardVote,
  shouldReply,
  type MessageContext,
} from "@/lib/bots/brain";

/**
 * POST /api/bots/react
 *
 * Called by a Supabase database trigger (via pg_net) when a new message
 * or card is inserted. Determines which bot personas should respond and
 * executes their actions.
 *
 * Protected by cron-style Bearer token auth (BOT_REACT_SECRET).
 * Dev-only: refuses to run if APP_URL points to production.
 */
export const POST = withAuth(
  { authMode: "cron", cronSecretEnv: "BOT_REACT_SECRET" },
  async (req) => {
    // Safety: refuse to run in production
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    if (appUrl.includes("meshit.app")) {
      return apiSuccess({ skipped: true, reason: "production" });
    }

    const body = await parseBody<{
      type: "message" | "card";
      record: Record<string, unknown>;
    }>(req);

    if (body.type === "message") {
      return handleMessage(body.record);
    }
    if (body.type === "card") {
      return handleCard(body.record);
    }

    throw new AppError("VALIDATION", `Unknown event type: ${body.type}`, 400);
  },
);

// Cache bot user IDs (resolved once per cold start)
let botUserMap: Map<string, string> | null = null; // name → userId

async function getBotUserMap(): Promise<Map<string, string>> {
  if (botUserMap) return botUserMap;

  const admin = createAdminClient();
  const botNames = PERSONAS.map((p) => p.name);
  const { data } = await admin
    .from("profiles")
    .select("user_id, full_name")
    .in("full_name", botNames);

  botUserMap = new Map();
  for (const p of data ?? []) {
    botUserMap.set(p.full_name, p.user_id);
  }
  return botUserMap;
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------

async function handleMessage(record: Record<string, unknown>) {
  const spaceId = record.space_id as string;
  const senderId = record.sender_id as string;
  const content = record.content as string;
  const msgType = record.type as string;

  if (!spaceId || !senderId || !content || msgType !== "message") {
    return apiSuccess({ skipped: true, reason: "not_a_text_message" });
  }

  const admin = createAdminClient();
  const userMap = await getBotUserMap();
  const botUserIds = new Set(userMap.values());

  // Don't react to bot messages (loop prevention)
  if (botUserIds.has(senderId)) {
    return apiSuccess({ skipped: true, reason: "bot_sender" });
  }

  // Find which bot personas are members of this space
  const { data: members } = await admin
    .from("space_members")
    .select("user_id")
    .eq("space_id", spaceId);

  const memberIds = new Set((members ?? []).map((m) => m.user_id));
  const memberCount = memberIds.size;

  // Fetch space name for context
  const { data: space } = await admin
    .from("spaces")
    .select("name")
    .eq("id", spaceId)
    .single();
  const spaceName = space?.name ?? "Space";

  // Fetch recent messages for conversation context
  const { data: recentMsgs } = await admin
    .from("space_messages")
    .select("content, sender_id")
    .eq("space_id", spaceId)
    .eq("type", "message")
    .order("created_at", { ascending: false })
    .limit(8);

  // Resolve sender names
  const senderIds = [
    ...new Set((recentMsgs ?? []).map((m) => m.sender_id).filter(Boolean)),
  ];
  const { data: profiles } = await admin
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", senderIds);
  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.user_id, p.full_name ?? "Someone"]),
  );

  const history: MessageContext[] = (recentMsgs ?? [])
    .reverse()
    .map((m) => ({
      senderName: nameMap.get(m.sender_id!) ?? "Someone",
      content: m.content ?? "",
    }))
    .filter((m) => m.content);

  // For each bot persona that's a member, decide + act
  const actions: string[] = [];
  const isDm = memberCount <= 2;

  for (const persona of PERSONAS) {
    const botId = userMap.get(persona.name);
    if (!botId || !memberIds.has(botId)) continue;

    if (!shouldReply(persona, content, isDm)) continue;

    const reply = await generateReply(persona, history, spaceName);
    if (!reply) continue;

    // Insert message as the bot (via admin client — bypasses RLS)
    const { error } = await admin.from("space_messages").insert({
      space_id: spaceId,
      sender_id: botId,
      type: "message",
      content: reply,
    });

    if (!error) {
      await admin
        .from("spaces")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", spaceId);

      actions.push(`${persona.name}: "${reply.slice(0, 60)}"`);
    }
  }

  return apiSuccess({ actions });
}

// ---------------------------------------------------------------------------
// Card handler
// ---------------------------------------------------------------------------

async function handleCard(record: Record<string, unknown>) {
  const spaceId = record.space_id as string;
  const cardId = record.id as string;
  const createdBy = record.created_by as string;
  const cardType = record.type as string;
  const cardData = record.data as {
    options?: { label: string; votes: string[] }[];
  };

  if (!spaceId || !cardId || !cardData?.options) {
    return apiSuccess({ skipped: true, reason: "invalid_card" });
  }

  const admin = createAdminClient();
  const userMap = await getBotUserMap();
  const botUserIds = new Set(userMap.values());

  // Don't vote on bot-created cards
  if (botUserIds.has(createdBy)) {
    return apiSuccess({ skipped: true, reason: "bot_creator" });
  }

  // Find bot members of this space
  const { data: members } = await admin
    .from("space_members")
    .select("user_id")
    .eq("space_id", spaceId);
  const memberIds = new Set((members ?? []).map((m) => m.user_id));

  const actions: string[] = [];

  for (const persona of PERSONAS) {
    const botId = userMap.get(persona.name);
    if (!botId || !memberIds.has(botId)) continue;

    const decision = decideCardVote(persona, cardType, cardData.options, botId);

    if (!decision.shouldVote) continue;

    // Vote via RPC (respects card logic — atomic, auto-resolve)
    const { error } = await admin.rpc("vote_on_card", {
      p_card_id: cardId,
      p_user_id: botId,
      p_option_index: decision.optionIndex,
    });

    if (!error) {
      const label = cardData.options[decision.optionIndex]?.label ?? "?";
      actions.push(`${persona.name} voted "${label}"`);
    }
  }

  return apiSuccess({ actions });
}
