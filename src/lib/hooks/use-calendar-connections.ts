"use client";

import useSWR from "swr";
import type { CalendarConnection } from "@/lib/calendar/types";
import { cacheKeys } from "@/lib/swr/keys";

type UseCalendarConnectionsResult = {
  connections: CalendarConnection[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
};

async function fetchConnections(): Promise<CalendarConnection[]> {
  const res = await fetch("/api/calendar/connections");
  if (!res.ok) throw new Error("Failed to fetch calendar connections");
  const data = await res.json();
  return data.connections;
}

export function useCalendarConnections(): UseCalendarConnectionsResult {
  const { data, error, isLoading, mutate } = useSWR(
    cacheKeys.calendarConnections(),
    fetchConnections,
  );

  return {
    connections: data ?? [],
    isLoading,
    error,
    mutate: () => {
      mutate();
    },
  };
}
