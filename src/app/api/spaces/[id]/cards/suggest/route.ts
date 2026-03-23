import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import {
  detectAndSuggest,
  generateCardPrefill,
  type MemberContext,
  type OverlapWindow,
} from "@/lib/ai/card-suggest";
import type { SpaceCardType } from "@/lib/supabase/types";
import { parseHiddenBlocks } from "@/lib/hidden-syntax";
import { createAdminClient } from "@/lib/supabase/admin";
import { windowsToConcreteDates } from "@/lib/calendar/overlap-to-slots";
import {
  intersectAvailability,
  subtractBusyBlocks,
  type BusyPeriod,
} from "@/lib/availability/overlap";

/**
 * POST /api/spaces/[id]/cards/suggest
 *
 * Fused detect-and-suggest: analyzes messages with full calendar + profile
 * context and returns card type + prefilled data in one LLM call.
 */
export const POST = withAuth(async (req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  const body = await parseBody<{
    messages?: { sender_name: string; content: string }[];
    message?: string;
    cardType?: SpaceCardType;
    composeText?: string;
  }>(req);

  // -------------------------------------------------------------------------
  // 0. Validate cardType if provided
  // -------------------------------------------------------------------------
  const VALID_CARD_TYPES: SpaceCardType[] = [
    "poll",
    "time_proposal",
    "rsvp",
    "task_claim",
    "location",
  ];
  if (body.cardType && !VALID_CARD_TYPES.includes(body.cardType)) {
    throw new AppError("VALIDATION", "Invalid card type", 400);
  }

  // -------------------------------------------------------------------------
  // 1. Build message context
  // -------------------------------------------------------------------------
  let recentMessages: { sender_name: string; content: string }[];
  if (body.messages && body.messages.length > 0) {
    recentMessages = body.messages.slice(-10);
  } else if (body.message || body.cardType) {
    // Fetch recent messages from DB — needed for both legacy (body.message)
    // and new cardType flow (where message/messages may be omitted)
    const { data: dbMessages } = await supabase
      .from("space_messages")
      .select("content, sender_id")
      .eq("space_id", spaceId)
      .eq("type", "message")
      .order("created_at", { ascending: false })
      .limit(5);

    const senderIds = [
      ...new Set(
        [...(dbMessages ?? []).map((m) => m.sender_id), user.id].filter(
          Boolean,
        ),
      ),
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

    // Append the user's message if provided (legacy path)
    if (body.message) {
      const senderName = nameMap.get(user.id) ?? "User";
      recentMessages.push({ sender_name: senderName, content: body.message });
    }
  } else {
    throw new AppError(
      "VALIDATION",
      "messages array or message is required",
      400,
    );
  }

  // -------------------------------------------------------------------------
  // 2. Scope guards (parallelized)
  // -------------------------------------------------------------------------
  const [
    { count: activeCardCount },
    { data: memberRows },
    { data: currentMemberRole },
  ] = await Promise.all([
    supabase
      .from("space_cards")
      .select("id", { count: "exact", head: true })
      .eq("space_id", spaceId)
      .eq("status", "active"),
    supabase.from("space_members").select("user_id").eq("space_id", spaceId),
    supabase
      .from("space_members")
      .select("role")
      .eq("space_id", spaceId)
      .eq("user_id", user.id)
      .single(),
  ]);

  if ((activeCardCount ?? 0) >= 2) {
    return apiSuccess({ suggestion: null, reason: "max_active_cards" });
  }

  const memberCount = memberRows?.length ?? 0;

  if (memberCount > 10 && currentMemberRole?.role !== "admin") {
    return apiSuccess({ suggestion: null, reason: "admin_only" });
  }

  // -------------------------------------------------------------------------
  // 3. Fetch member profiles + calendar data (parallel)
  // -------------------------------------------------------------------------
  const memberIds = (memberRows ?? []).map((m) => m.user_id);
  const admin = createAdminClient();

  const [profilesResult, busyBlocksResult] = await Promise.all([
    admin
      .from("profiles")
      .select("user_id, full_name, source_text, availability_slots, timezone")
      .in("user_id", memberIds),
    admin
      .from("calendar_busy_blocks")
      .select("profile_id, start_time, end_time")
      .in("profile_id", memberIds)
      .not("start_time", "is", null)
      .not("end_time", "is", null)
      .gte("end_time", new Date().toISOString())
      .lte("start_time", new Date(Date.now() + 14 * 86400000).toISOString()),
  ]);

  const profiles = profilesResult.data ?? [];
  const busyBlocks = busyBlocksResult.data ?? [];

  // Group busy blocks by profile_id
  const busyByMember = new Map<string, BusyPeriod[]>();
  for (const block of busyBlocks) {
    if (!block.profile_id || !block.start_time || !block.end_time) continue;
    let list = busyByMember.get(block.profile_id);
    if (!list) {
      list = [];
      busyByMember.set(block.profile_id, list);
    }
    list.push({
      start: new Date(block.start_time),
      end: new Date(block.end_time),
    });
  }

  // Build member context with hidden text extraction
  const members: MemberContext[] = profiles.map((p) => {
    const hiddenBlocks = p.source_text ? parseHiddenBlocks(p.source_text) : [];
    const hiddenText =
      hiddenBlocks.length > 0
        ? hiddenBlocks.map((b) => b.content.trim()).join("\n")
        : null;

    return {
      user_id: p.user_id,
      name: p.full_name ?? "User",
      hidden_text: hiddenText,
      timezone: p.timezone,
    };
  });

  // -------------------------------------------------------------------------
  // 4. Compute calendar overlap (if availability data exists)
  // -------------------------------------------------------------------------
  let overlap: OverlapWindow[] | null = null;

  const memberSlots = profiles.map(
    (p) => p.availability_slots as Record<string, string[]> | null,
  );
  const intersectedWindows = intersectAvailability(memberSlots);

  if (intersectedWindows.length > 0) {
    const rawSlots = windowsToConcreteDates(intersectedWindows, new Date(), 14);

    // Subtract actual calendar busy blocks from the availability windows
    const concreteSlots = subtractBusyBlocks(rawSlots, busyByMember);

    if (concreteSlots.length > 0) {
      overlap = concreteSlots.slice(0, 20).map((s) => {
        const startDt = new Date(s.start);
        const endDt = new Date(s.end);
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayName = dayNames[startDt.getUTCDay()];
        const dateStr = startDt.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
        const startTime = startDt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "UTC",
        });
        const endTime = endDt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "UTC",
        });
        return {
          label: `${dayName} ${dateStr}: ${startTime} - ${endTime}`,
          start: s.start,
          end: s.end,
        };
      });
    } else {
      overlap = [];
    }
  }

  // -------------------------------------------------------------------------
  // 5. Call LLM — branch based on whether user chose the card type
  // -------------------------------------------------------------------------
  if (body.cardType) {
    // User already chose the card type via the cheap client-side detector.
    // Append composeText as the last message so the LLM sees it in context.
    if (body.composeText) {
      recentMessages.push({
        sender_name: "User",
        content: body.composeText,
      });
    }

    const result = await generateCardPrefill(
      body.cardType,
      recentMessages,
      members,
      overlap,
      body.composeText,
    );

    // No confidence check — user chose the type, confidence is always 1.0
    if (!result.suggested_type) {
      // Only null if slots failed to generate for time types
      return apiSuccess({ suggestion: null, reason: "no_slots_generated" });
    }

    return apiSuccess({ suggestion: result });
  }

  // Existing flow: detect type + generate prefill in one LLM call
  const result = await detectAndSuggest(recentMessages, members, overlap);

  if (!result.suggested_type || result.confidence < 0.6) {
    return apiSuccess({ suggestion: null, reason: "low_confidence" });
  }

  return apiSuccess({ suggestion: result });
});
