import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError, parseBody } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import {
  detectAndSuggest,
  type MemberContext,
  type OverlapWindow,
} from "@/lib/ai/card-suggest";
import { parseHiddenBlocks } from "@/lib/hidden-syntax";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  windowsToConcreteDates,
  formatSlotsForPrompt,
} from "@/lib/calendar/overlap-to-slots";
import type { CommonAvailabilityWindow } from "@/lib/types/scheduling";

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
  }>(req);

  // -------------------------------------------------------------------------
  // 1. Build message context
  // -------------------------------------------------------------------------
  let recentMessages: { sender_name: string; content: string }[];
  if (body.messages && body.messages.length > 0) {
    recentMessages = body.messages.slice(-10);
  } else if (body.message) {
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

    const senderName = nameMap.get(user.id) ?? "User";
    recentMessages.push({ sender_name: senderName, content: body.message });
  } else {
    throw new AppError(
      "VALIDATION",
      "messages array or message is required",
      400,
    );
  }

  // -------------------------------------------------------------------------
  // 2. Scope guards
  // -------------------------------------------------------------------------
  const { count: activeCardCount } = await supabase
    .from("space_cards")
    .select("id", { count: "exact", head: true })
    .eq("space_id", spaceId)
    .eq("status", "active");

  if ((activeCardCount ?? 0) >= 2) {
    return apiSuccess({ suggestion: null, reason: "max_active_cards" });
  }

  const { data: memberRows } = await supabase
    .from("space_members")
    .select("user_id")
    .eq("space_id", spaceId);

  const memberCount = memberRows?.length ?? 0;

  if (memberCount > 10) {
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
      .select("profile_id, canonical_ranges")
      .in("profile_id", memberIds)
      .not("canonical_ranges", "is", null),
  ]);

  const profiles = profilesResult.data ?? [];
  // Busy blocks fetched for future subtraction from overlap windows
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const busyBlocks = busyBlocksResult.data ?? [];

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

  // Compute INTERSECTION of per-member availability windows
  // Each member's grid → set of (day, slot) pairs. Overlap = present in ALL.
  const dayMap: Record<string, number> = {
    mon: 0,
    tue: 1,
    wed: 2,
    thu: 3,
    fri: 4,
    sat: 5,
    sun: 6,
  };
  const slotMap: Record<string, { start: number; end: number }> = {
    night: { start: 0, end: 360 },
    morning: { start: 360, end: 720 },
    afternoon: { start: 720, end: 1080 },
    evening: { start: 1080, end: 1440 },
  };

  const profilesWithSlots = profiles.filter((p) => p.availability_slots);

  const intersectedWindows: CommonAvailabilityWindow[] = [];

  if (profilesWithSlots.length > 0) {
    // Build per-member window sets, keyed by "day:start:end"
    const perMemberKeys: Set<string>[] = profilesWithSlots.map((p) => {
      const keys = new Set<string>();
      const slots = p.availability_slots as Record<string, string[]>;
      for (const [day, periods] of Object.entries(slots)) {
        const dow = dayMap[day];
        if (dow === undefined) continue;
        for (const period of periods) {
          const range = slotMap[period];
          if (range) keys.add(`${dow}:${range.start}:${range.end}`);
        }
      }
      return keys;
    });

    // Intersect: keep only windows present in ALL members' sets
    const firstSet = perMemberKeys[0];
    for (const key of firstSet) {
      if (perMemberKeys.every((s) => s.has(key))) {
        const [dow, start, end] = key.split(":").map(Number);
        intersectedWindows.push({
          day_of_week: dow,
          start_minutes: start,
          end_minutes: end,
        });
      }
    }
  }

  if (intersectedWindows.length > 0) {
    const concreteSlots = windowsToConcreteDates(
      intersectedWindows,
      new Date(),
      14,
    );

    // TODO: subtract busy blocks from concrete slots for true overlap
    // For now, use availability windows as-is (busy block subtraction
    // requires int4range intersection which is complex client-side)

    if (concreteSlots.length > 0) {
      overlap = concreteSlots.slice(0, 20).map((s) => ({
        label: formatSlotsForPrompt([s]),
        start: s.start,
        end: s.end,
      }));
    } else {
      overlap = [];
    }
  }

  // -------------------------------------------------------------------------
  // 5. Call fused detect-and-suggest LLM
  // -------------------------------------------------------------------------
  const result = await detectAndSuggest(recentMessages, members, overlap);

  if (!result.suggested_type || result.confidence < 0.6) {
    return apiSuccess({ suggestion: null, reason: "low_confidence" });
  }

  return apiSuccess({ suggestion: result });
});
