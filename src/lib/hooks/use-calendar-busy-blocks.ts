"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import type { RecurringWindow } from "@/lib/types/availability";
import type { CalendarBusyBlockRow } from "@/lib/calendar/types";

type UseCalendarBusyBlocksResult = {
  busyWindows: RecurringWindow[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
};

/**
 * Parse PostgreSQL int4range string like "[1440,1500)" into
 * { lower: 1440, upper: 1500 }.
 */
function parseRange(range: string): { lower: number; upper: number } | null {
  const match = range.match(/[\[(\s]*(\d+)\s*,\s*(\d+)\s*[)\]]/);
  if (!match) return null;
  return { lower: parseInt(match[1], 10), upper: parseInt(match[2], 10) };
}

/**
 * Convert canonical int4range strings to RecurringWindow[] for display.
 * Each range maps to day_of_week * 1440 + minutes.
 */
function canonicalRangesToWindows(
  blocks: CalendarBusyBlockRow[],
): RecurringWindow[] {
  // Collect all unique canonical ranges across all blocks
  const allRanges = new Set<string>();
  for (const block of blocks) {
    if (block.canonical_ranges) {
      for (const range of block.canonical_ranges) {
        allRanges.add(range);
      }
    }
  }

  const windows: RecurringWindow[] = [];
  for (const rangeStr of allRanges) {
    const parsed = parseRange(rangeStr);
    if (!parsed) continue;

    const dayOfWeek = Math.floor(parsed.lower / 1440);
    const startMinutes = parsed.lower - dayOfWeek * 1440;
    const endMinutes = parsed.upper - dayOfWeek * 1440;

    if (dayOfWeek >= 0 && dayOfWeek <= 6 && startMinutes >= 0 && endMinutes <= 1440) {
      windows.push({
        window_type: "recurring",
        day_of_week: dayOfWeek,
        start_minutes: startMinutes,
        end_minutes: endMinutes,
      });
    }
  }

  return windows;
}

async function fetchBusyBlocks(
  key: string,
): Promise<RecurringWindow[]> {
  const [, profileId] = key.split(":");
  const supabase = createClient();

  const { data, error } = await supabase
    .from("calendar_busy_blocks")
    .select("*")
    .eq("profile_id", profileId);

  if (error) throw error;

  return canonicalRangesToWindows((data ?? []) as CalendarBusyBlockRow[]);
}

export function useCalendarBusyBlocks(
  profileId: string | null,
): UseCalendarBusyBlocksResult {
  const key = profileId ? `busy-blocks:${profileId}` : null;
  const { data, error, isLoading, mutate } = useSWR(key, fetchBusyBlocks);

  return {
    busyWindows: data ?? [],
    isLoading,
    error,
    mutate: () => {
      mutate();
    },
  };
}
