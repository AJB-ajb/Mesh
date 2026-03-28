import { withAuth } from "@/lib/api/with-auth";
import { apiSuccess, AppError } from "@/lib/errors";
import { verifySpaceMembership } from "@/lib/api/space-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { windowsToConcreteDates } from "@/lib/calendar/overlap-to-slots";
import {
  intersectRecurringWindows,
  legacySlotsToWindows,
  subtractBusyBlocks,
  type BusyPeriod,
  type RecurringWindowInput,
  type AvailabilitySlotsMap,
} from "@/lib/availability/overlap";
import type { SpaceCard, TimeProposalData } from "@/lib/supabase/types";

/**
 * GET /api/spaces/[id]/calendar
 *
 * Returns aggregate free-slot overlap, resolved Space events, and the
 * requesting user's busy blocks for the Shared Calendar Tab.
 * Scoped to small Spaces (≤10 members).
 */
export const GET = withAuth(async (_req, { user, supabase, params }) => {
  const spaceId = params.id;

  await verifySpaceMembership(supabase, spaceId, user.id);

  // -----------------------------------------------------------------------
  // 1. Fetch members — guard against large Spaces
  // -----------------------------------------------------------------------
  const { data: memberRows } = await supabase
    .from("space_members")
    .select("user_id")
    .eq("space_id", spaceId);

  const memberIds = (memberRows ?? []).map((m) => m.user_id);
  const totalMembers = memberIds.length;

  if (totalMembers > 10) {
    throw new AppError(
      "VALIDATION",
      "Shared calendar is only available for spaces with ≤10 members",
      400,
    );
  }

  // -----------------------------------------------------------------------
  // 2. Fetch availability windows, legacy slots, busy blocks, cards
  // -----------------------------------------------------------------------
  const admin = createAdminClient();
  const now = new Date();
  const horizon = new Date(Date.now() + 14 * 86400000);

  const [windowsResult, profilesResult, busyBlocksResult, cardsResult] =
    await Promise.all([
      admin
        .from("availability_windows")
        .select("profile_id, day_of_week, start_minutes, end_minutes")
        .in("profile_id", memberIds)
        .eq("window_type", "recurring"),
      admin
        .from("profiles")
        .select("user_id, availability_slots")
        .in("user_id", memberIds),
      admin
        .from("calendar_busy_blocks")
        .select("profile_id, start_time, end_time")
        .in("profile_id", memberIds)
        .not("start_time", "is", null)
        .not("end_time", "is", null)
        .gte("end_time", now.toISOString())
        .lte("start_time", horizon.toISOString()),
      supabase
        .from("space_cards")
        .select("id, type, data, status")
        .eq("space_id", spaceId)
        .eq("status", "resolved")
        .in("type", ["time_proposal", "rsvp"]),
    ]);

  // -----------------------------------------------------------------------
  // 3. Build per-member availability windows (new table + legacy fallback)
  // -----------------------------------------------------------------------
  const windowsByMember = new Map<string, RecurringWindowInput[]>();
  for (const row of windowsResult.data ?? []) {
    if (
      !row.profile_id ||
      row.day_of_week == null ||
      row.start_minutes == null ||
      row.end_minutes == null
    )
      continue;
    let list = windowsByMember.get(row.profile_id);
    if (!list) {
      list = [];
      windowsByMember.set(row.profile_id, list);
    }
    list.push({
      day_of_week: row.day_of_week,
      start_minutes: row.start_minutes,
      end_minutes: row.end_minutes,
    });
  }

  // Fallback: for members without availability_windows rows, try legacy slots
  const profiles = profilesResult.data ?? [];
  const legacyByUser = new Map<string, AvailabilitySlotsMap>();
  for (const p of profiles) {
    const slots = p.availability_slots as Record<string, string[]> | null;
    if (slots && Object.keys(slots).length > 0) {
      legacyByUser.set(p.user_id, slots);
    }
  }

  // Build the array for intersection — one entry per member
  const memberWindowsArray: (RecurringWindowInput[] | null)[] = memberIds.map(
    (id) => {
      const windows = windowsByMember.get(id);
      if (windows && windows.length > 0) return windows;
      const legacy = legacyByUser.get(id);
      if (legacy) return legacySlotsToWindows(legacy);
      return null;
    },
  );

  // -----------------------------------------------------------------------
  // 4. Compute aggregate overlap
  // -----------------------------------------------------------------------
  const busyByMember = new Map<string, BusyPeriod[]>();
  for (const block of busyBlocksResult.data ?? []) {
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

  // Count members with calendar data
  const membersWithCalendar = new Set<string>();
  for (const pid of busyByMember.keys()) membersWithCalendar.add(pid);
  for (const id of windowsByMember.keys()) membersWithCalendar.add(id);
  for (const id of legacyByUser.keys()) membersWithCalendar.add(id);

  let freeSlots: Array<{ start: string; end: string; label: string }> = [];

  const intersectedWindows = intersectRecurringWindows(memberWindowsArray);

  if (intersectedWindows.length > 0) {
    const rawSlots = windowsToConcreteDates(intersectedWindows, now, 14);
    const concreteSlots = subtractBusyBlocks(rawSlots, busyByMember);

    freeSlots = concreteSlots.map((s) => {
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
        start: s.start,
        end: s.end,
        label: `${dayName} ${dateStr}: ${startTime} - ${endTime}`,
      };
    });
  }

  // -----------------------------------------------------------------------
  // 5. Extract events from resolved cards
  // -----------------------------------------------------------------------
  const events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    type: string;
  }> = [];

  for (const card of (cardsResult.data ?? []) as SpaceCard[]) {
    const data = card.data as TimeProposalData;

    if (card.type === "time_proposal" && data.slot_times && data.options) {
      const resolvedLabel = data.resolved_slot;
      const winnerIdx = resolvedLabel
        ? data.options.findIndex((o) => o.label === resolvedLabel)
        : -1;
      const slotTime =
        winnerIdx >= 0 ? data.slot_times[winnerIdx] : data.slot_times[0];
      if (slotTime) {
        events.push({
          id: card.id,
          title: data.title || "Meeting",
          start: slotTime.start,
          end: slotTime.end,
          type: card.type,
        });
      }
    } else if (card.type === "rsvp" && data.slot_times?.[0]) {
      events.push({
        id: card.id,
        title: data.title || "Event",
        start: data.slot_times[0].start,
        end: data.slot_times[0].end,
        type: card.type,
      });
    }
  }

  // -----------------------------------------------------------------------
  // 6. Current user's busy blocks (for display on client)
  // -----------------------------------------------------------------------
  const myBusyBlocks = (busyByMember.get(user.id) ?? []).map((b) => ({
    start: b.start.toISOString(),
    end: b.end.toISOString(),
  }));

  return apiSuccess({
    freeSlots,
    events,
    myBusyBlocks,
    connectedCalendars: membersWithCalendar.size,
    totalMembers,
  });
});
