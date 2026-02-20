"use client";

import { useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { labels } from "@/lib/labels";
import type { RecurringWindow } from "@/lib/types/availability";
import { useCommonAvailability } from "@/lib/hooks/use-common-availability";
import { useMeetingProposals } from "@/lib/hooks/use-meeting-proposals";
import { TeamAvailabilityView } from "./team-availability-view";
import { MeetingProposer } from "./meeting-proposer";
import { MeetingProposalCard } from "./meeting-proposal-card";

/**
 * Convert a day-of-week (0=Mon..6=Sun) + minute-of-day to the next occurrence
 * as a `YYYY-MM-DDTHH:mm` string suitable for datetime-local input.
 * Always picks 1–7 days ahead to avoid proposing meetings in the past.
 */
function dayMinutesToNextISO(dayOfWeek: number, startMinutes: number): string {
  const now = new Date();
  // JS getDay(): 0=Sun,1=Mon..6=Sat → our 0=Mon..6=Sun
  const jsDay = now.getDay();
  const todayMon = jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon
  let daysAhead = dayOfWeek - todayMon;
  if (daysAhead <= 0) daysAhead += 7;
  const target = new Date(now);
  target.setDate(target.getDate() + daysAhead);
  target.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
  // Format as YYYY-MM-DDTHH:mm
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}T${pad(target.getHours())}:${pad(target.getMinutes())}`;
}

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

  const [timeSelection, setTimeSelection] = useState<RecurringWindow | null>(
    null,
  );

  const handleTimeSelect = useCallback(
    (day: number, startMinutes: number, endMinutes: number) => {
      setTimeSelection({
        window_type: "recurring",
        day_of_week: day,
        start_minutes: startMinutes,
        end_minutes: endMinutes,
      });
    },
    [],
  );

  const handleClearSelection = useCallback(() => {
    setTimeSelection(null);
  }, []);

  const meetingPrefill = useMemo(() => {
    if (!timeSelection) return null;
    return {
      startTime: dayMinutesToNextISO(
        timeSelection.day_of_week,
        timeSelection.start_minutes,
      ),
      duration: timeSelection.end_minutes - timeSelection.start_minutes,
    };
  }, [timeSelection]);

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
      <TeamAvailabilityView
        windows={windows}
        onTimeSelect={isOwner ? handleTimeSelect : undefined}
        timeSelection={timeSelection}
      />

      {/* Meeting proposals section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">
            {labels.scheduling.proposalsTitle}
          </h4>
          {isOwner && (
            <MeetingProposer
              onPropose={handlePropose}
              prefill={meetingPrefill}
              onClear={handleClearSelection}
            />
          )}
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
