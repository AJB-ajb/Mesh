"use client";

import useSWR from "swr";
import type { CommonAvailabilityWindow } from "@/lib/types/scheduling";

type UseCommonAvailabilityResult = {
  windows: CommonAvailabilityWindow[];
  isLoading: boolean;
  error: Error | undefined;
};

async function fetchCommonAvailability(
  key: string,
): Promise<CommonAvailabilityWindow[]> {
  const postingId = key.split("/")[2]; // "api/postings/{id}/common-availability"
  const res = await fetch(`/api/postings/${postingId}/common-availability`);
  if (!res.ok) throw new Error("Failed to fetch common availability");
  const data = await res.json();
  return data.windows;
}

export function useCommonAvailability(
  postingId: string | null,
): UseCommonAvailabilityResult {
  const key = postingId
    ? `api/postings/${postingId}/common-availability`
    : null;

  const { data, error, isLoading } = useSWR(key, fetchCommonAvailability);

  return {
    windows: data ?? [],
    isLoading,
    error,
  };
}
