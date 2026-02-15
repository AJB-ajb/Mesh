"use client";

import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Check,
  Sparkles,
  Loader2,
  Pencil,
  Trash2,
  Send,
  Clock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatScore } from "@/lib/matching/scoring";
import type {
  PostingDetail,
  Application,
} from "@/lib/hooks/use-posting-detail";
import type { ScoreBreakdown } from "@/lib/supabase/types";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
};

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

function computeOverallScore(breakdown: ScoreBreakdown): number {
  return (
    breakdown.semantic * 0.3 +
    breakdown.availability * 0.3 +
    breakdown.skill_level * 0.2 +
    breakdown.location * 0.2
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
  isReactivating: boolean;
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onReactivate: () => void;
};

function OwnerActions({
  posting,
  isEditing,
  isSaving,
  isDeleting,
  isReactivating,
  onSave,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onReactivate,
}: OwnerActionsProps) {
  if (isEditing) {
    return (
      <div className="flex gap-2">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Save
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancelEdit}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {isExpired(posting.expires_at) && (
        <Button onClick={onReactivate} disabled={isReactivating}>
          {isReactivating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Reactivate
        </Button>
      )}
      <Button variant="outline" onClick={onStartEdit}>
        <Pencil className="h-4 w-4" />
        Edit
      </Button>
      <Button variant="destructive" onClick={onDelete} disabled={isDeleting}>
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
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
          {myApplication?.status === "pending" && "Request Pending"}
          {myApplication?.status === "accepted" && "\u2713 Accepted"}
          {myApplication?.status === "rejected" && "Not Selected"}
          {myApplication?.status === "withdrawn" && "Withdrawn"}
          {myApplication?.status === "waitlisted" && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Waitlisted
              {waitlistPosition ? ` — #${waitlistPosition} in line` : ""}
            </span>
          )}
        </Badge>
        {(myApplication?.status === "pending" ||
          myApplication?.status === "waitlisted") && (
          <Button variant="outline" size="sm" onClick={onWithdraw}>
            Withdraw
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
              Joining waitlist...
            </>
          ) : (
            <>
              <Clock className="h-4 w-4" />
              Join waitlist
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
            placeholder="Tell the posting creator why you'd like to join... (optional)"
            rows={3}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <div className="flex gap-2">
            <Button onClick={onApply} disabled={isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4" />
                  Request to join waitlist
                </>
              )}
            </Button>
            <Button variant="outline" onClick={onHideApplyForm}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Button onClick={onShowApplyForm}>
        <Clock className="h-4 w-4" />
        Request to join waitlist
      </Button>
    );
  }

  // Non-open, non-filled (e.g. closed, expired)
  if (posting.status !== "open") {
    return <Badge variant="secondary">Posting {posting.status}</Badge>;
  }

  // Auto-accept: instant join, no cover message form
  if (posting.auto_accept) {
    return (
      <Button onClick={onApply} disabled={isApplying}>
        {isApplying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Join
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
          placeholder="Tell the posting creator why you'd like to join... (optional)"
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
        <div className="flex gap-2">
          <Button onClick={onApply} disabled={isApplying}>
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Request to join
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onHideApplyForm}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={onShowApplyForm}>
      <Send className="h-4 w-4" />
      Request to join
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
  isReactivating: boolean;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onReactivate: () => void;
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
};

export function PostingDetailHeader({
  posting,
  isOwner,
  matchBreakdown,
  isEditing,
  isSaving,
  isDeleting,
  isReactivating,
  editTitle,
  onEditTitleChange,
  onSave,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onReactivate,
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
}: PostingDetailHeaderProps) {
  const creatorName = posting.profiles?.full_name || "Unknown";

  return (
    <>
      <Link
        href="/postings"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to postings
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
              {isExpired(posting.expires_at) ? "Expired" : posting.status}
            </Badge>
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
                {formatScore(computeOverallScore(matchBreakdown))} match
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Created by {creatorName} &bull; {formatDate(posting.created_at)}
          </p>
        </div>

        {isOwner ? (
          <OwnerActions
            posting={posting}
            isEditing={isEditing}
            isSaving={isSaving}
            isDeleting={isDeleting}
            isReactivating={isReactivating}
            onSave={onSave}
            onCancelEdit={onCancelEdit}
            onStartEdit={onStartEdit}
            onDelete={onDelete}
            onReactivate={onReactivate}
          />
        ) : (
          <div className="flex gap-2">
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
        )}
      </div>
    </>
  );
}
