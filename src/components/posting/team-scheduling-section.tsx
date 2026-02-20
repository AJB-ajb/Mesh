"use client";

import { useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { labels } from "@/lib/labels";
import { useCommonAvailability } from "@/lib/hooks/use-common-availability";
import { useMeetingProposals } from "@/lib/hooks/use-meeting-proposals";
import { TeamAvailabilityView } from "./team-availability-view";
import { MeetingProposer } from "./meeting-proposer";
import { MeetingProposalCard } from "./meeting-proposal-card";

type TeamSchedulingSectionProps = {
  postingId: string;
  postingTitle?: string;
  isOwner: boolean;
  currentUserId: string;
};

export function TeamSchedulingSection({
  postingId,
  postingTitle,
  isOwner,
  currentUserId,
}: TeamSchedulingSectionProps) {
  const { windows, isLoading: isLoadingAvail } =
    useCommonAvailability(postingId);
  const {
    proposals,
    isLoading: isLoadingProposals,
    mutate,
  } = useMeetingProposals(postingId);

  const handlePropose = useCallback(
    async (data: { title?: string; startTime: string; endTime: string }) => {
      const res = await fetch(`/api/postings/${postingId}/proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to create proposal");
      }
      mutate();
    },
    [postingId, mutate],
  );

  const handleConfirm = useCallback(
    async (proposalId: string) => {
      const res = await fetch(
        `/api/postings/${postingId}/proposals/${proposalId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "confirmed" }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to confirm");
      }
      mutate();
    },
    [postingId, mutate],
  );

  const handleCancel = useCallback(
    async (proposalId: string) => {
      const res = await fetch(
        `/api/postings/${postingId}/proposals/${proposalId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "cancelled" }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to cancel");
      }
      mutate();
    },
    [postingId, mutate],
  );

  const handleRespond = useCallback(
    async (proposalId: string, response: "available" | "unavailable") => {
      const res = await fetch(
        `/api/postings/${postingId}/proposals/${proposalId}/respond`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ response }),
        },
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message ?? "Failed to respond");
      }
      mutate();
    },
    [postingId, mutate],
  );

  const isLoading = isLoadingAvail || isLoadingProposals;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {labels.scheduling.sectionTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">
        {labels.scheduling.sectionTitle}
      </h3>

      {/* Common availability grid */}
      <TeamAvailabilityView windows={windows} />

      {/* Meeting proposals section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">
            {labels.scheduling.proposalsTitle}
          </h4>
          {isOwner && <MeetingProposer onPropose={handlePropose} />}
        </div>

        {proposals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {labels.scheduling.noProposals}
          </p>
        ) : (
          proposals.map((proposal) => (
            <MeetingProposalCard
              key={proposal.id}
              proposal={proposal}
              postingId={postingId}
              postingTitle={postingTitle}
              isOwner={isOwner}
              currentUserId={currentUserId}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              onRespond={handleRespond}
            />
          ))
        )}
      </div>
    </div>
  );
}
