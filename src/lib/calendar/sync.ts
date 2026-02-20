/**
 * Calendar sync orchestration: busy block storage + canonical-week projection.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { BusyBlock } from "./types";
import { CALENDAR_SYNC } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Canonical week projection
// ---------------------------------------------------------------------------

/**
 * Project busy blocks onto a canonical week.
 *
 * For each busy block, convert UTC times to the user's timezone,
 * then map each day spanned to `day_of_week * 1440 + minutes` canonical ranges.
 *
 * For scoring, we average across 4 weeks: a slot is included if busy >= 2 of 4 weeks.
 *
 * Returns an array of int4range strings like "[1440,1500)".
 */
export function projectToCanonicalWeek(
  blocks: BusyBlock[],
  timezone: string,
): string[] {
  // Track which 15-min slots are busy per week-slot (slot = day*96 + quarter-hour)
  // 7 days * 96 quarter-hours = 672 total slots
  const SLOT_SIZE = 15; // minutes
  const SLOTS_PER_DAY = 1440 / SLOT_SIZE; // 96
  const TOTAL_SLOTS = 7 * SLOTS_PER_DAY; // 672

  // Count how many weeks each slot is busy
  const slotWeekCount = new Map<number, Set<number>>();

  for (const block of blocks) {
    // Convert to user timezone
    const startLocal = toTimezone(block.start, timezone);
    const endLocal = toTimezone(block.end, timezone);

    // Walk through each SLOT_SIZE interval within the block
    const startMs = startLocal.getTime();
    const endMs = endLocal.getTime();

    for (let ms = startMs; ms < endMs; ms += SLOT_SIZE * 60 * 1000) {
      const dt = new Date(ms);
      const dayOfWeek = getIsoDayOfWeek(dt); // 0=Mon..6=Sun
      const minuteOfDay = dt.getHours() * 60 + dt.getMinutes();
      const slotIndex = dayOfWeek * SLOTS_PER_DAY + Math.floor(minuteOfDay / SLOT_SIZE);

      if (slotIndex < 0 || slotIndex >= TOTAL_SLOTS) continue;

      // Track week number (ISO week approximation from date)
      const weekNum = getIsoWeekNumber(dt);
      if (!slotWeekCount.has(slotIndex)) {
        slotWeekCount.set(slotIndex, new Set());
      }
      slotWeekCount.get(slotIndex)!.add(weekNum);
    }
  }

  // Filter: slot is included if busy in >= CANONICAL_MIN_WEEKS_BUSY of observed weeks
  const busySlots: number[] = [];
  for (const [slotIndex, weeks] of slotWeekCount) {
    if (weeks.size >= CALENDAR_SYNC.CANONICAL_MIN_WEEKS_BUSY) {
      busySlots.push(slotIndex);
    }
  }

  // Convert busy slots to canonical minute ranges and merge adjacent
  busySlots.sort((a, b) => a - b);
  return mergeToCanonicalRanges(busySlots, SLOT_SIZE);
}

/**
 * Convert sorted busy slot indices into merged int4range strings.
 */
function mergeToCanonicalRanges(
  slots: number[],
  slotSize: number,
): string[] {
  if (slots.length === 0) return [];

  const SLOTS_PER_DAY = 1440 / slotSize;
  const ranges: string[] = [];
  let rangeStart = -1;
  let rangeEnd = -1;

  for (const slot of slots) {
    const dayOfWeek = Math.floor(slot / SLOTS_PER_DAY);
    const minuteStart = (slot % SLOTS_PER_DAY) * slotSize;
    const canonicalStart = dayOfWeek * 1440 + minuteStart;
    const canonicalEnd = canonicalStart + slotSize;

    // Track day boundary: don't merge across days
    const rangeStartDay = rangeStart >= 0 ? Math.floor(rangeStart / 1440) : -1;

    if (rangeStart === -1) {
      rangeStart = canonicalStart;
      rangeEnd = canonicalEnd;
    } else if (canonicalStart === rangeEnd && dayOfWeek === rangeStartDay) {
      // Adjacent slot on same day, extend range
      rangeEnd = canonicalEnd;
    } else {
      // Gap, emit previous range
      ranges.push(`[${rangeStart},${rangeEnd})`);
      rangeStart = canonicalStart;
      rangeEnd = canonicalEnd;
    }
  }

  if (rangeStart !== -1) {
    ranges.push(`[${rangeStart},${rangeEnd})`);
  }

  return ranges;
}

// ---------------------------------------------------------------------------
// Sync: store busy blocks for a connection
// ---------------------------------------------------------------------------

/**
 * Replace all busy blocks for a connection with new ones.
 * Computes canonical_ranges from the blocks and the user's timezone.
 */
export async function storeBusyBlocks(
  supabase: SupabaseClient,
  connectionId: string,
  profileId: string,
  blocks: BusyBlock[],
  timezone: string,
): Promise<void> {
  // Delete existing blocks for this connection
  await supabase
    .from("calendar_busy_blocks")
    .delete()
    .eq("connection_id", connectionId);

  if (blocks.length === 0) return;

  // Compute canonical ranges
  const canonicalRanges = projectToCanonicalWeek(blocks, timezone);

  // Insert new blocks
  const rows = blocks.map((block) => ({
    connection_id: connectionId,
    profile_id: profileId,
    start_time: block.start.toISOString(),
    end_time: block.end.toISOString(),
    canonical_ranges: canonicalRanges.length > 0 ? canonicalRanges : null,
  }));

  // Batch insert (Supabase supports arrays)
  const { error } = await supabase.from("calendar_busy_blocks").insert(rows);
  if (error) throw error;
}

/**
 * Update connection sync status and metadata.
 */
export async function updateConnectionSyncStatus(
  supabase: SupabaseClient,
  connectionId: string,
  status: "pending" | "syncing" | "synced" | "error",
  error?: string,
): Promise<void> {
  const update: Record<string, unknown> = {
    sync_status: status,
    updated_at: new Date().toISOString(),
  };

  if (status === "synced") {
    update.last_synced_at = new Date().toISOString();
    update.sync_error = null;
  }

  if (status === "error" && error) {
    update.sync_error = error;
  }

  await supabase
    .from("calendar_connections")
    .update(update)
    .eq("id", connectionId);
}

// ---------------------------------------------------------------------------
// Timezone helpers
// ---------------------------------------------------------------------------

/**
 * Convert a UTC Date to a Date in the specified timezone.
 * Returns a new Date object whose UTC methods return the local time values.
 */
function toTimezone(date: Date, timezone: string): Date {
  const str = date.toLocaleString("en-US", { timeZone: timezone });
  return new Date(str);
}

/**
 * Get ISO day of week: Monday=0, Sunday=6.
 */
function getIsoDayOfWeek(date: Date): number {
  const jsDay = date.getDay(); // 0=Sunday
  return jsDay === 0 ? 6 : jsDay - 1;
}

/**
 * Get ISO week number from a date.
 */
function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
