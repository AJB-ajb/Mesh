"use client";

import { useState } from "react";
import { Users, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTimeAgoShort } from "@/lib/format";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { labels } from "@/lib/labels";
import type {
  SpacePostingWithCreator,
  SpacePostingStatus,
} from "@/lib/supabase/types";
import { JoinRequestDialog } from "./join-request-dialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadgeVariant(
  status: SpacePostingStatus,
): "default" | "secondary" | "success" | "warning" | "destructive" {
  switch (status) {
    case "open":
      return "success";
    case "active":
      return "default";
    case "filled":
      return "warning";
    case "closed":
    case "expired":
      return "secondary";
    default:
      return "secondary";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PostingBrowserCardProps {
  posting: SpacePostingWithCreator;
  userId: string | null;
}

export function PostingBrowserCard({
  posting,
  userId,
}: PostingBrowserCardProps) {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const creatorName = posting.profiles?.full_name ?? "Unknown";
  const isOwn = userId === posting.created_by;
  const showJoinButton = posting.status === "open" && !isOwn;

  return (
    <>
      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        {/* Text */}
        <MarkdownRenderer
          content={posting.text}
          className="text-sm"
          clamp={3}
        />

        {/* Tags */}
        {posting.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {posting.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" />
            {posting.capacity}
          </span>
          {posting.deadline && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {new Date(posting.deadline).toLocaleDateString()}
            </span>
          )}
          <Badge
            variant={statusBadgeVariant(posting.status)}
            className="text-xs"
          >
            {posting.status}
          </Badge>
        </div>

        {/* Footer: creator + join */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {creatorName}
            {" \u00b7 "}
            <RelativeTime
              date={posting.created_at}
              formatter={formatTimeAgoShort}
            />
          </span>
          {showJoinButton && (
            <Button
              size="sm"
              className="h-7 text-xs"
              onClick={() => setJoinDialogOpen(true)}
            >
              {posting.auto_accept
                ? labels.spaces.posting.join
                : labels.spaces.posting.requestToJoin}
            </Button>
          )}
        </div>
      </div>

      <JoinRequestDialog
        postingId={posting.id}
        postingTitle={posting.text}
        autoAccept={posting.auto_accept}
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
      />
    </>
  );
}
