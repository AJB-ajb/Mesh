/**
 * Calendar integration for resolved time proposal cards.
 *
 * When a time proposal resolves, creates Google Calendar events
 * for participants who have connected their calendar.
 *
 * Best-effort: failures are logged but don't block the resolve flow.
 */

import type { SpaceCard } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Parse a resolved slot label into a start/end datetime range.
 * Slot labels are free-text (e.g. "Tue Mar 18, 6:00 PM"), so parsing
 * is best-effort. Returns null if unparseable.
 */
export function parseResolvedSlot(
  label: string,
): { start: Date; end: Date } | null {
  try {
    const parsed = new Date(label);
    if (isNaN(parsed.getTime())) return null;

    const start = parsed;
    const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h default
    return { start, end };
  } catch {
    return null;
  }
}

/**
 * Create calendar events for all connected users who voted for
 * the winning time slot. Fire-and-forget — errors are logged.
 *
 * Uses admin client to bypass RLS and read all voters' calendar connections.
 */
export async function createEventsForResolvedCard(
  card: SpaceCard,
  spaceId: string,
): Promise<void> {
  const data = card.data as unknown as Record<string, unknown>;
  const resolvedSlot = data.resolved_slot as string | undefined;
  if (!resolvedSlot) return;

  // Try structured slot_times first (Phase A), fall back to label parsing
  let parsed: { start: Date; end: Date } | null = null;
  const slotTimes = data.slot_times as
    | Array<{ start: string; end: string }>
    | undefined;
  const options = (data.options ?? []) as {
    label: string;
    votes: string[];
  }[];
  if (slotTimes) {
    const slotIndex = options.findIndex((o) => o.label === resolvedSlot);
    if (slotIndex >= 0 && slotTimes[slotIndex]) {
      parsed = {
        start: new Date(slotTimes[slotIndex].start),
        end: new Date(slotTimes[slotIndex].end),
      };
    }
  }

  // Fall back to parsing the label + duration_minutes
  if (!parsed) {
    parsed = parseResolvedSlot(resolvedSlot);
    if (parsed && data.duration_minutes) {
      parsed.end = new Date(
        parsed.start.getTime() + (data.duration_minutes as number) * 60 * 1000,
      );
    }
  }

  if (!parsed) {
    console.log(
      `[calendar-integration] Could not parse slot "${resolvedSlot}" — skipping calendar creation`,
    );
    return;
  }

  // Find voters for the winning option
  const winningOption = options.find((o) => o.label === resolvedSlot);
  const voterIds = winningOption?.votes ?? [];
  if (voterIds.length === 0) return;

  // Use admin client to bypass RLS — we need to read all voters' connections
  const admin = createAdminClient();

  // Fetch space name for event summary
  const { data: space } = await admin
    .from("spaces")
    .select("name")
    .eq("id", spaceId)
    .single();

  const summary = `${(data.title as string) ?? "Meeting"} — ${space?.name ?? "Mesh"}`;

  // Fetch connected Google Calendar tokens for voters
  // Table uses profile_id (= user_id) and encrypted token columns
  const { data: connections } = await admin
    .from("calendar_connections")
    .select(
      "profile_id, access_token_encrypted, refresh_token_encrypted, token_expires_at",
    )
    .eq("provider", "google")
    .in("profile_id", voterIds);

  if (!connections || connections.length === 0) return;

  // Dynamically import to avoid bundling googleapis on client
  const { createCalendarEvent } = await import("@/lib/calendar/google");

  let created = 0;
  const results = await Promise.allSettled(
    connections.map(async (conn) => {
      await createCalendarEvent({
        accessTokenEncrypted: conn.access_token_encrypted,
        refreshTokenEncrypted: conn.refresh_token_encrypted,
        summary,
        startTime: parsed.start,
        endTime: parsed.end,
        description: `Auto-created by Mesh when "${(data.title as string) ?? "time proposal"}" was resolved.`,
      });
      created++;
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) {
    for (const r of results) {
      if (r.status === "rejected") {
        console.error(
          "[calendar-integration] Event creation failed:",
          r.reason,
        );
      }
    }
  }
  console.log(
    `[calendar-integration] Created ${created}/${connections.length} calendar events for card ${card.id}`,
  );
}

/**
 * Create a calendar event for a single user who committed to a resolved card.
 * Used by the commitment endpoint for non-auto-committed users.
 */
export async function createEventForUser(
  card: SpaceCard,
  spaceId: string,
  userId: string,
  tentative: boolean = false,
): Promise<void> {
  const data = card.data as unknown as Record<string, unknown>;
  const resolvedSlot = data.resolved_slot as string | undefined;
  if (!resolvedSlot) return;

  // Parse time — same logic as createEventsForResolvedCard
  let parsed: { start: Date; end: Date } | null = null;
  const slotTimes = data.slot_times as
    | Array<{ start: string; end: string }>
    | undefined;
  const options = (data.options ?? []) as {
    label: string;
    votes: string[];
  }[];

  if (slotTimes) {
    const slotIndex = options.findIndex((o) => o.label === resolvedSlot);
    if (slotIndex >= 0 && slotTimes[slotIndex]) {
      parsed = {
        start: new Date(slotTimes[slotIndex].start),
        end: new Date(slotTimes[slotIndex].end),
      };
    }
  }

  if (!parsed) {
    parsed = parseResolvedSlot(resolvedSlot);
    if (parsed && data.duration_minutes) {
      parsed.end = new Date(
        parsed.start.getTime() + (data.duration_minutes as number) * 60 * 1000,
      );
    }
  }

  if (!parsed) return;

  const admin = createAdminClient();

  const { data: space } = await admin
    .from("spaces")
    .select("name")
    .eq("id", spaceId)
    .single();

  const summary = `${(data.title as string) ?? "Meeting"} — ${space?.name ?? "Mesh"}`;

  const { data: connections } = await admin
    .from("calendar_connections")
    .select(
      "profile_id, access_token_encrypted, refresh_token_encrypted, token_expires_at",
    )
    .eq("provider", "google")
    .eq("profile_id", userId);

  if (!connections || connections.length === 0) return;

  const { createCalendarEvent } = await import("@/lib/calendar/google");
  const conn = connections[0];

  await createCalendarEvent({
    accessTokenEncrypted: conn.access_token_encrypted,
    refreshTokenEncrypted: conn.refresh_token_encrypted,
    summary,
    startTime: parsed.start,
    endTime: parsed.end,
    description: `Auto-created by Mesh when "${(data.title as string) ?? "time proposal"}" was resolved.${tentative ? " (tentative)" : ""}`,
  });

  console.log(
    `[calendar-integration] Created calendar event for user ${userId} on card ${card.id}${tentative ? " (tentative)" : ""}`,
  );
}
