"use client";

import useSWR from "swr";
import type { MeetingProposal } from "@/lib/types/scheduling";

type UseMeetingProposalsResult = {
  proposals: MeetingProposal[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
};

async function fetchProposals(key: string): Promise<MeetingProposal[]> {
  const postingId = key.split("/")[2]; // "api/postings/{id}/proposals"
  const res = await fetch(`/api/postings/${postingId}/proposals`);
  if (!res.ok) throw new Error("Failed to fetch meeting proposals");
  const data = await res.json();
  return data.proposals;
}

export function useMeetingProposals(
  postingId: string | null,
): UseMeetingProposalsResult {
  const key = postingId ? `api/postings/${postingId}/proposals` : null;

  const { data, error, isLoading, mutate } = useSWR(key, fetchProposals);

  return {
    proposals: data ?? [],
    isLoading,
    error,
    mutate: () => {
      mutate();
    },
  };
}
