"use client";

import useSWR from "swr";
import type { CalendarConnection } from "@/lib/calendar/types";

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
    "calendar-connections",
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
