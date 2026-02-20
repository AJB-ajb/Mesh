"use client";

import { Clock, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { labels } from "@/lib/labels";
import type {
  PostingDetail,
  Application,
} from "@/lib/hooks/use-posting-detail";

export type ApplySectionProps = {
  posting: PostingDetail;
  hasApplied: boolean;
  myApplication: Application | null;
  waitlistPosition: number | null;
  showApplyForm: boolean;
  coverMessage: string;
  isApplying: boolean;
  onShowApplyForm: () => void;
  onHideApplyForm: () => void;
  onCoverMessageChange: (value: string) => void;
  onApply: () => void;
  onWithdraw: () => void;
};

export function ApplySection({
  posting,
  hasApplied,
  myApplication,
  waitlistPosition,
  showApplyForm,
  coverMessage,
  isApplying,
  onShowApplyForm,
  onHideApplyForm,
  onCoverMessageChange,
  onApply,
  onWithdraw,
}: ApplySectionProps) {
  if (hasApplied) {
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant={
            myApplication?.status === "accepted"
              ? "default"
              : myApplication?.status === "rejected"
                ? "destructive"
                : myApplication?.status === "withdrawn"
                  ? "outline"
                  : "secondary"
          }
          className="px-3 py-1"
        >
          {myApplication?.status === "pending" &&
            labels.joinRequest.applicantStatus.pending}
          {myApplication?.status === "accepted" &&
            `\u2713 ${labels.joinRequest.applicantStatus.accepted}`}
          {myApplication?.status === "rejected" &&
            labels.joinRequest.applicantStatus.rejected}
          {myApplication?.status === "withdrawn" &&
            labels.joinRequest.applicantStatus.withdrawn}
          {myApplication?.status === "waitlisted" && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {labels.joinRequest.applicantStatus.waitlisted}
              {waitlistPosition
                ? labels.postingDetail.waitlistPosition(waitlistPosition)
                : ""}
            </span>
          )}
        </Badge>
        {(myApplication?.status === "pending" ||
          myApplication?.status === "waitlisted") && (
          <Button variant="outline" size="sm" onClick={onWithdraw}>
            {labels.joinRequest.action.withdraw}
          </Button>
        )}
      </div>
    );
  }

  // Filled posting: show waitlist CTA
  if (posting.status === "filled") {
    if (posting.auto_accept) {
      return (
        <Button onClick={onApply} disabled={isApplying}>
          {isApplying ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {labels.postingDetail.joiningWaitlist}
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" />
              {labels.joinRequest.action.joinWaitlist}
            </>
          )}
        </Button>
      );
    }

    // Manual review: show cover message form for waitlist
    if (showApplyForm) {
      return (
        <div className="flex flex-col gap-2 w-full max-w-md">
          <textarea
            value={coverMessage}
            onChange={(e) => onCoverMessageChange(e.target.value)}
            placeholder={labels.chat.coverMessagePlaceholder}
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <div className="flex gap-2">
            <Button onClick={onApply} disabled={isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {labels.postingDetail.requesting}
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  {labels.joinRequest.action.requestWaitlist}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onHideApplyForm}>
              {labels.common.cancel}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Button onClick={onShowApplyForm}>
        <Clock className="h-4 w-4" />
        {labels.joinRequest.action.requestWaitlist}
      </Button>
    );
  }

  // Non-open, non-filled (e.g. closed, expired)
  if (posting.status !== "open") {
    return (
      <Badge variant="secondary">
        {labels.postingDetail.postingStatus(posting.status)}
      </Badge>
    );
  }

  // Auto-accept: instant join, no cover message form
  if (posting.auto_accept) {
    return (
      <Button onClick={onApply} disabled={isApplying}>
        {isApplying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {labels.postingDetail.joining}
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            {labels.joinRequest.action.join}
          </>
        )}
      </Button>
    );
  }

  if (showApplyForm) {
    return (
      <div className="flex flex-col gap-2 w-full max-w-md">
        <textarea
          value={coverMessage}
          onChange={(e) => onCoverMessageChange(e.target.value)}
          placeholder={labels.chat.coverMessagePlaceholder}
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <div className="flex gap-2">
          <Button onClick={onApply} disabled={isApplying}>
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {labels.postingDetail.requestingToJoin}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {labels.joinRequest.action.requestToJoin}
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onHideApplyForm}>
            {labels.common.cancel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={onShowApplyForm}>
      <Send className="h-4 w-4" />
      {labels.joinRequest.action.requestToJoin}
    </Button>
  );
}
