"use client";

import { useState } from "react";
import { Clock, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { labels } from "@/lib/labels";
import { usePostingCoreContext } from "./posting-core-context";
import { usePostingApplicationContext } from "./posting-application-context";
import { SmartAcceptanceCard } from "./smart-acceptance-card";

export function ApplySection() {
  const { posting, postingId } = usePostingCoreContext();
  const {
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
  } = usePostingApplicationContext();

  const [showAcceptanceCard, setShowAcceptanceCard] = useState(false);

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

  // Filled posting: show waitlist CTA (no acceptance card for waitlist)
  if (posting.status === "filled") {
    if (posting.auto_accept) {
      return (
        <Button onClick={() => onApply()} disabled={isApplying}>
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
            <Button onClick={() => onApply()} disabled={isApplying}>
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

  // --- Open posting: show acceptance card flow ---

  // Acceptance card is shown
  if (showAcceptanceCard) {
    return (
      <SmartAcceptanceCard
        postingId={postingId}
        onSubmit={async (responses) => {
          await onApply(responses);
          setShowAcceptanceCard(false);
        }}
        onCancel={() => setShowAcceptanceCard(false)}
        isSubmitting={isApplying}
      />
    );
  }

  // Auto-accept: show Join button that opens acceptance card
  if (posting.auto_accept) {
    return (
      <Button onClick={() => setShowAcceptanceCard(true)} disabled={isApplying}>
        <Send className="h-4 w-4" />
        {labels.joinRequest.action.join}
      </Button>
    );
  }

  // Manual review: show cover message form then acceptance card
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
          <Button
            onClick={() => setShowAcceptanceCard(true)}
            disabled={isApplying}
          >
            <Send className="h-4 w-4" />
            {labels.joinRequest.action.requestToJoin}
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
