"use client";

import Link from "next/link";
import { Share2, Flag, MessageSquare, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInitials } from "@/lib/format";
import { labels } from "@/lib/labels";
import { useSharePosting } from "@/lib/hooks/use-share-posting";
import { usePostingCoreContext } from "./posting-core-context";

export function PostingSidebar() {
  const { posting, isOwner, onContactCreator } = usePostingCoreContext();

  const creatorName = posting.profiles?.full_name || "Unknown";
  const creatorHeadline = posting.profiles?.headline || "";
  const { shared, handleShare } = useSharePosting(posting.title);

  return (
    <div className="space-y-6">
      {/* Creator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {labels.postingDetail.postingCreator}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {getInitials(creatorName)}
            </div>
            <div>
              <Link
                href={`/profile/${posting.profiles?.user_id}`}
                className="font-medium hover:underline"
              >
                {creatorName}
              </Link>
              {creatorHeadline && (
                <p className="text-sm text-muted-foreground">
                  {creatorHeadline}
                </p>
              )}
            </div>
          </div>
          {!isOwner && (
            <Button className="w-full" onClick={onContactCreator}>
              <MessageSquare className="h-4 w-4" />
              {labels.postingDetail.contactCreator}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Actions — hidden for owners since they have the overflow menu */}
      {!isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {labels.postingDetail.actionsTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleShare}
            >
              {shared ? (
                <>
                  <Check className="h-4 w-4" />
                  {labels.postingDetail.linkCopied}
                </>
              ) : (
                <>
                  <Share2 className="h-4 w-4" />
                  {labels.postingDetail.sharePosting}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled
              title="Coming soon"
            >
              <Flag className="h-4 w-4" />
              {labels.postingDetail.reportIssue}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
