/**
 * Calendar integration for resolved time proposal cards.
 *
 * When a time proposal resolves, creates Google Calendar events
 * for participants who have connected their calendar.
 *
 * Best-effort: failures are logged but don't block the resolve flow.
 */

import type { SpaceCard } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

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
 */
export async function createEventsForResolvedCard(
  card: SpaceCard,
  spaceId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const data = card.data as unknown as Record<string, unknown>;
  const resolvedSlot = data.resolved_slot as string | undefined;
  if (!resolvedSlot) return;

  const parsed = parseResolvedSlot(resolvedSlot);
  if (!parsed) {
    console.log(
      `[calendar-integration] Could not parse slot "${resolvedSlot}" — skipping calendar creation`,
    );
    return;
  }

  // Find voters for the winning option
  const options = (data.options ?? []) as {
    label: string;
    votes: string[];
  }[];
  const winningOption = options.find((o) => o.label === resolvedSlot);
  const voterIds = winningOption?.votes ?? [];
  if (voterIds.length === 0) return;

  // Fetch space name for event summary
  const { data: space } = await supabase
    .from("spaces")
    .select("name")
    .eq("id", spaceId)
    .single();

  const summary = `${(data.title as string) ?? "Meeting"} — ${space?.name ?? "Mesh"}`;

  // Fetch connected Google Calendar tokens for voters
  const { data: connections } = await supabase
    .from("calendar_connections")
    .select("user_id, access_token, refresh_token, expires_at")
    .eq("provider", "google")
    .in("user_id", voterIds);

  if (!connections || connections.length === 0) return;

  // Dynamically import to avoid bundling googleapis on client
  const { createCalendarEvent } = await import("@/lib/calendar/google");

  const results = await Promise.allSettled(
    connections.map(async (conn) => {
      try {
        await createCalendarEvent({
          accessTokenEncrypted: conn.access_token,
          refreshTokenEncrypted: conn.refresh_token,
          summary,
          startTime: parsed.start,
          endTime: parsed.end,
          description: `Auto-created by Mesh when "${(data.title as string) ?? "time proposal"}" was resolved.`,
        });
      } catch (err) {
        console.error(
          `[calendar-integration] Failed to create event for user ${conn.user_id}:`,
          err,
        );
      }
    }),
  );

  const created = results.filter((r) => r.status === "fulfilled").length;
  console.log(
    `[calendar-integration] Created ${created}/${connections.length} calendar events for card ${card.id}`,
  );
}
