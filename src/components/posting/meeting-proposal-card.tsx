"use client";

import { useState } from "react";
import { Check, X, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import { ExportMenu } from "./export-menu";
import type {
  MeetingProposal,
  MeetingResponseRecord,
  ProposalStatus,
} from "@/lib/types/scheduling";

type MeetingProposalCardProps = {
  proposal: MeetingProposal;
  postingId: string;
  postingTitle?: string;
  isOwner: boolean;
  currentUserId: string;
  onConfirm: (proposalId: string) => Promise<void>;
  onCancel: (proposalId: string) => Promise<void>;
  onRespond: (
    proposalId: string,
    response: "available" | "unavailable",
  ) => Promise<void>;
};

const STATUS_BADGE_VARIANT: Record<
  ProposalStatus,
  "default" | "secondary" | "destructive"
> = {
  proposed: "secondary",
  confirmed: "default",
  cancelled: "destructive",
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(startIso: string, endIso: string): string {
  const mins = Math.round(
    (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
  );
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function MeetingProposalCard({
  proposal,
  postingId,
  postingTitle,
  isOwner,
  currentUserId,
  onConfirm,
  onCancel,
  onRespond,
}: MeetingProposalCardProps) {
  const [isActing, setIsActing] = useState(false);

  const responses = (proposal.responses ?? []) as MeetingResponseRecord[];
  const myResponse = responses.find((r) => r.responder_id === currentUserId);

  const availableCount = responses.filter(
    (r) => r.response === "available",
  ).length;

  const handleAction = async (action: () => Promise<void>) => {
    setIsActing(true);
    try {
      await action();
    } finally {
      setIsActing(false);
    }
  };

  const statusLabel =
    proposal.status === "proposed"
      ? labels.scheduling.statusProposed
      : proposal.status === "confirmed"
        ? labels.scheduling.statusConfirmed
        : labels.scheduling.statusCancelled;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {proposal.title || formatDateTime(proposal.start_time)}
            </CardTitle>
            {proposal.title && (
              <p className="text-sm text-muted-foreground">
                {formatDateTime(proposal.start_time)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {formatDuration(proposal.start_time, proposal.end_time)}
            </p>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[proposal.status]}>
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Response indicators */}
        {responses.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              {labels.scheduling.respondedCount(
                responses.length,
                responses.length + (myResponse ? 0 : 1),
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              {responses.map((r) => (
                <div key={r.id} className="flex items-center gap-1.5 text-xs">
                  {r.response === "available" ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-destructive" />
                  )}
                  <span>
                    {r.profiles?.full_name ?? labels.common.unknownUser}
                  </span>
                </div>
              ))}
            </div>
            {availableCount > 0 && (
              <p className="text-xs text-green-600">
                {availableCount} available
              </p>
            )}
          </div>
        )}

        {/* Response buttons (team member, only for proposed status) */}
        {proposal.status === "proposed" && !isOwner && (
          <div className="flex gap-2">
            <Button
              variant={
                myResponse?.response === "available" ? "default" : "outline"
              }
              size="sm"
              disabled={isActing}
              onClick={() =>
                handleAction(() => onRespond(proposal.id, "available"))
              }
            >
              {isActing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              )}
              {labels.scheduling.responseAvailable}
            </Button>
            <Button
              variant={
                myResponse?.response === "unavailable"
                  ? "destructive"
                  : "outline"
              }
              size="sm"
              disabled={isActing}
              onClick={() =>
                handleAction(() => onRespond(proposal.id, "unavailable"))
              }
            >
              {isActing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="mr-1.5 h-3.5 w-3.5" />
              )}
              {labels.scheduling.responseUnavailable}
            </Button>
          </div>
        )}

        {/* Owner actions (confirm/cancel, only for proposed status) */}
        {proposal.status === "proposed" && isOwner && (
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={isActing}
              onClick={() => handleAction(() => onConfirm(proposal.id))}
            >
              {isActing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              )}
              {labels.scheduling.confirmButton}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isActing}
              onClick={() => handleAction(() => onCancel(proposal.id))}
            >
              {isActing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Clock className="mr-1.5 h-3.5 w-3.5" />
              )}
              {labels.scheduling.cancelButton}
            </Button>
          </div>
        )}

        {/* Export actions (confirmed only) */}
        {proposal.status === "confirmed" && (
          <ExportMenu
            proposal={proposal}
            postingId={postingId}
            postingTitle={postingTitle}
          />
        )}
      </CardContent>
    </Card>
  );
}
