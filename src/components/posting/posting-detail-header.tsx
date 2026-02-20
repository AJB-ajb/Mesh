"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  Sparkles,
  Loader2,
  Pencil,
  Trash2,
  Send,
  Clock,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { computeWeightedScore, formatScore } from "@/lib/matching/scoring";
import { labels } from "@/lib/labels";
import { DEADLINES } from "@/lib/constants";
import type {
  PostingDetail,
  Application,
} from "@/lib/hooks/use-posting-detail";
import { formatDateAgo } from "@/lib/format";
import type { ScoreBreakdown } from "@/lib/supabase/types";

const isExpired = (expiresAt: string | null) => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

const formatExpiry = (expiresAt: string | null) => {
  if (!expiresAt) return null;
  const date = new Date(expiresAt);
  const now = new Date();
  const diffDays = Math.ceil(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return `Expired ${Math.abs(diffDays)} days ago`;
  if (diffDays === 0) return "Expires today";
  if (diffDays === 1) return "Expires tomorrow";
  if (diffDays < 7) return `Expires in ${diffDays} days`;
  if (diffDays < 30) return `Expires in ${Math.floor(diffDays / 7)} weeks`;
  return `Expires ${date.toLocaleDateString()}`;
};

// Removed inline computeOverallScore — use shared computeWeightedScore instead

// ---------------------------------------------------------------------------
// Extend Deadline Picker
// ---------------------------------------------------------------------------

const EXTEND_OPTIONS = DEADLINES.EXTEND_OPTIONS.map((days) => ({
  label: `${days} days`,
  days,
}));

function ExtendDeadlineButtons({
  isExtending,
  onExtend,
}: {
  isExtending: boolean;
  onExtend: (days: number) => void;
}) {
  const [selectedDays, setSelectedDays] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EXTEND_OPTIONS.map((opt) => (
        <Button
          key={opt.days}
          size="sm"
          variant={selectedDays === opt.days ? "default" : "outline"}
          disabled={isExtending}
          onClick={() => {
            setSelectedDays(opt.days);
            onExtend(opt.days);
          }}
        >
          {isExtending && selectedDays === opt.days ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <CalendarPlus className="h-3 w-3" />
          )}
          +{opt.label}
        </Button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Owner Actions
// ---------------------------------------------------------------------------

type OwnerActionsProps = {
  posting: PostingDetail;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isExtending: boolean;
  isReposting: boolean;
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onExtendDeadline: (days: number) => void;
  onRepost: () => void;
  hideEditButton?: boolean;
};

function OwnerActions({
  posting,
  isEditing,
  isSaving,
  isDeleting,
  isExtending,
  isReposting,
  onSave,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onExtendDeadline,
  onRepost,
  hideEditButton,
}: OwnerActionsProps) {
  if (isEditing) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {labels.postingDetail.saving}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {labels.common.save}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancelEdit}>
          {labels.common.cancel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      {isExpired(posting.expires_at) && (
        <div className="flex gap-2 items-center flex-wrap justify-end">
          <ExtendDeadlineButtons
            isExtending={isExtending}
            onExtend={onExtendDeadline}
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isReposting}>
                {isReposting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {labels.common.repost}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {labels.postingDetail.repostTitle}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {labels.postingDetail.repostDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{labels.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={onRepost}>
                  {labels.common.repost}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!hideEditButton && (
          <Button variant="outline" onClick={onStartEdit}>
            <Pencil className="h-4 w-4" />
            {labels.common.edit}
          </Button>
        )}
        <Button variant="destructive" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Apply Section (non-owner)
// ---------------------------------------------------------------------------

type ApplySectionProps = {
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

function ApplySection({
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

// ---------------------------------------------------------------------------
// Main Header
// ---------------------------------------------------------------------------

type PostingDetailHeaderProps = {
  posting: PostingDetail;
  isOwner: boolean;
  matchBreakdown: ScoreBreakdown | null;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isExtending: boolean;
  isReposting: boolean;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onExtendDeadline: (days: number) => void;
  onRepost: () => void;
  // Apply props (non-owner)
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
  error: string | null;
  hideApplySection?: boolean;
  hideEditButton?: boolean;
  backHref?: string;
  backLabel?: string;
};

export function PostingDetailHeader({
  posting,
  isOwner,
  matchBreakdown,
  isEditing,
  isSaving,
  isDeleting,
  isExtending,
  isReposting,
  editTitle,
  onEditTitleChange,
  onSave,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onExtendDeadline,
  onRepost,
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
  error,
  hideApplySection,
  hideEditButton,
  backHref,
  backLabel,
}: PostingDetailHeaderProps) {
  const creatorName = posting.profiles?.full_name || "Unknown";

  return (
    <>
      <Link
        href={backHref ?? "/my-postings"}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {backLabel ?? labels.common.backToPostings}
      </Link>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            {isEditing ? (
              <input
                value={editTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
                className="text-2xl font-bold flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            ) : (
              <h1 className="text-3xl font-bold tracking-tight">
                {posting.title}
              </h1>
            )}
            <Badge
              variant={
                posting.status === "open"
                  ? isExpired(posting.expires_at)
                    ? "destructive"
                    : "default"
                  : posting.status === "filled"
                    ? "secondary"
                    : "outline"
              }
            >
              {isExpired(posting.expires_at)
                ? labels.common.expired
                : posting.status}
            </Badge>
            {(posting.visibility === "private" ||
              posting.mode === "friend_ask") && (
              <Badge variant="outline">{labels.invite.privateBadge}</Badge>
            )}
            {posting.expires_at && (
              <span
                className={`text-xs ${isExpired(posting.expires_at) ? "text-destructive" : "text-muted-foreground"}`}
              >
                {formatExpiry(posting.expires_at)}
              </span>
            )}
            {!isOwner && matchBreakdown && (
              <Badge
                variant="default"
                className="bg-green-500 hover:bg-green-600 flex items-center gap-1"
              >
                <Sparkles className="h-4 w-4" />
                {formatScore(computeWeightedScore(matchBreakdown))}{" "}
                {labels.postingDetail.match}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {labels.postingDetail.postedBy}{" "}
            <Link
              href={`/profile/${posting.profiles?.user_id}`}
              className="hover:underline text-foreground"
            >
              {creatorName}
            </Link>{" "}
            &bull; {formatDateAgo(posting.created_at)}
          </p>
        </div>

        {isOwner ? (
          <OwnerActions
            posting={posting}
            isEditing={isEditing}
            isSaving={isSaving}
            isDeleting={isDeleting}
            isExtending={isExtending}
            isReposting={isReposting}
            onSave={onSave}
            onCancelEdit={onCancelEdit}
            onStartEdit={onStartEdit}
            onDelete={onDelete}
            onExtendDeadline={onExtendDeadline}
            onRepost={onRepost}
            hideEditButton={hideEditButton}
          />
        ) : (
          !hideApplySection && (
            <div className="flex flex-wrap gap-2">
              <ApplySection
                posting={posting}
                hasApplied={hasApplied}
                myApplication={myApplication}
                waitlistPosition={waitlistPosition}
                showApplyForm={showApplyForm}
                coverMessage={coverMessage}
                isApplying={isApplying}
                onShowApplyForm={onShowApplyForm}
                onHideApplyForm={onHideApplyForm}
                onCoverMessageChange={onCoverMessageChange}
                onApply={onApply}
                onWithdraw={onWithdraw}
              />
            </div>
          )
        )}
      </div>
    </>
  );
}
