"use client";

import useSWR from "swr";
import { cacheKeys } from "@/lib/swr/keys";

export interface CalendarFreeSlot {
  start: string;
  end: string;
  label: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: string;
}

interface SpaceCalendarData {
  freeSlots: CalendarFreeSlot[];
  events: CalendarEvent[];
  connectedCalendars: number;
  totalMembers: number;
}

export function useSpaceCalendar(
  spaceId: string | null,
  enabled: boolean = true,
) {
  const key = spaceId && enabled ? cacheKeys.spaceCalendar(spaceId) : null;

  // Uses the global apiFetcher from SWRProvider
  const { data, error, isLoading, mutate } = useSWR<SpaceCalendarData>(key);

  return {
    freeSlots: data?.freeSlots ?? [],
    events: data?.events ?? [],
    connectedCalendars: data?.connectedCalendars ?? 0,
    totalMembers: data?.totalMembers ?? 0,
    isLoading,
    error,
    mutate,
  };
}
