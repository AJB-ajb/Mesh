"use client";

import useSWR from "swr";
import { createClient } from "@/lib/supabase/client";
import {
  type AvailabilityWindow,
  type AvailabilityWindowRow,
  type RecurringWindow,
  type SpecificWindow,
  parseWindowRow,
} from "@/lib/types/availability";

type UseAvailabilityWindowsResult = {
  recurringWindows: RecurringWindow[];
  specificWindows: SpecificWindow[];
  isLoading: boolean;
  error: Error | undefined;
  replaceWindows: (
    windows: AvailabilityWindow[],
    ownerId: { profileId?: string; postingId?: string },
  ) => Promise<void>;
  mutate: () => void;
};

async function fetchWindows(
  key: string,
): Promise<{ recurring: RecurringWindow[]; specific: SpecificWindow[] }> {
  const supabase = createClient();
  const [, type, id] = key.split(":");

  let query = supabase.from("availability_windows").select("*");
  if (type === "profile") {
    query = query.eq("profile_id", id);
  } else {
    query = query.eq("posting_id", id);
  }

  const { data, error } = await query;
  if (error) throw error;

  const recurring: RecurringWindow[] = [];
  const specific: SpecificWindow[] = [];

  for (const row of (data ?? []) as AvailabilityWindowRow[]) {
    const parsed = parseWindowRow(row);
    if (!parsed) continue;
    if (parsed.window_type === "recurring") recurring.push(parsed);
    else specific.push(parsed);
  }

  return { recurring, specific };
}

export function useAvailabilityWindows(
  ownerId: { profileId?: string; postingId?: string } | null,
): UseAvailabilityWindowsResult {
  const key = ownerId?.profileId
    ? `availability:profile:${ownerId.profileId}`
    : ownerId?.postingId
      ? `availability:posting:${ownerId.postingId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetchWindows);

  const replaceWindows = async (
    windows: AvailabilityWindow[],
    owner: { profileId?: string; postingId?: string },
  ) => {
    const supabase = createClient();

    // Delete existing windows
    if (owner.profileId) {
      await supabase
        .from("availability_windows")
        .delete()
        .eq("profile_id", owner.profileId);
    } else if (owner.postingId) {
      await supabase
        .from("availability_windows")
        .delete()
        .eq("posting_id", owner.postingId);
    }

    // Insert new windows
    if (windows.length > 0) {
      const rows = windows.map((w) => {
        if (w.window_type === "recurring") {
          return {
            profile_id: owner.profileId ?? null,
            posting_id: owner.postingId ?? null,
            window_type: "recurring" as const,
            day_of_week: w.day_of_week,
            start_minutes: w.start_minutes,
            end_minutes: w.end_minutes,
          };
        }
        return {
          profile_id: owner.profileId ?? null,
          posting_id: owner.postingId ?? null,
          window_type: "specific" as const,
          specific_date: w.specific_date,
          start_time_utc: w.start_time_utc,
          end_time_utc: w.end_time_utc,
        };
      });
      await supabase.from("availability_windows").insert(rows);
    }

    mutate();
  };

  return {
    recurringWindows: data?.recurring ?? [],
    specificWindows: data?.specific ?? [],
    isLoading,
    error,
    replaceWindows,
    mutate: () => mutate(),
  };
}
