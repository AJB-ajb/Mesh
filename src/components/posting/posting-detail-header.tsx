"use client";

import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { computeWeightedScore, formatScore } from "@/lib/matching/scoring";
import { labels } from "@/lib/labels";
import { formatDateAgo } from "@/lib/format";
import { usePostingCoreContext } from "./posting-core-context";
import { usePostingEditContext } from "./posting-edit-context";
import { OwnerActions } from "./owner-actions";
import { ApplySection } from "./apply-section";

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

type PostingDetailHeaderProps = {
  hideApplySection?: boolean;
  hideEditButton?: boolean;
};

export function PostingDetailHeader({
  hideApplySection,
  hideEditButton,
}: PostingDetailHeaderProps) {
  const { posting, isOwner, matchBreakdown, error, backHref, backLabel } =
    usePostingCoreContext();
  const { isEditing, form, onFormChange } = usePostingEditContext();

  const creatorName = posting.profiles?.full_name || "Unknown";
  const editTitle = form.title;

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
                onChange={(e) => onFormChange("title", e.target.value)}
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
          <OwnerActions hideEditButton={hideEditButton} />
        ) : (
          !hideApplySection && (
            <div className="flex flex-wrap gap-2">
              <ApplySection />
            </div>
          )
        )}
      </div>
    </>
  );
}
