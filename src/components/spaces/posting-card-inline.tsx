"use client";

import { useState, useCallback } from "react";
import {
  Users,
  Clock,
  Tag,
  Pencil,
  Trash2,
  XCircle,
  CheckCircle2,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTimeAgoShort } from "@/lib/format";
import { labels } from "@/lib/labels";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { cn } from "@/lib/utils";
import type { SpacePosting, SpacePostingStatus } from "@/lib/supabase/types";
import { JoinRequestDialog } from "./join-request-dialog";
import { PostingEditDialog } from "./posting-edit-dialog";

interface PostingCardInlineProps {
  posting: SpacePosting;
  creatorName: string;
  createdAt: string;
  isOwn: boolean;
  spaceId?: string;
  isAdmin?: boolean;
  onJoin?: () => void;
}

const statusVariant: Record<
  SpacePostingStatus,
  "success" | "info" | "secondary"
> = {
  open: "success",
  active: "info",
  closed: "secondary",
  filled: "secondary",
  expired: "secondary",
};

export function PostingCardInline({
  posting,
  creatorName,
  createdAt,
  isOwn,
  spaceId,
  isAdmin,
}: PostingCardInlineProps) {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const showJoinButton = posting.status === "open" && !isOwn;
  const showControls = (isOwn || isAdmin) && spaceId;

  const handleStatusChange = useCallback(
    async (status: string) => {
      if (!spaceId) return;
      await fetch(`/api/spaces/${spaceId}/postings/${posting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    },
    [spaceId, posting.id],
  );

  const handleDelete = useCallback(async () => {
    if (!spaceId || !confirm("Delete this posting?")) return;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.from("space_postings").delete().eq("id", posting.id);
  }, [spaceId, posting.id]);

  return (
    <>
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <Card className="max-w-[85%] overflow-hidden py-0">
          <CardContent className="p-3 space-y-2">
            {/* Creator + time */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{creatorName}</span>
              <span>&middot;</span>
              <RelativeTime date={createdAt} formatter={formatTimeAgoShort} />
            </div>

            {/* Posting text */}
            <MarkdownRenderer
              content={posting.text}
              className="text-sm"
              clamp={3}
            />

            {/* Meta row: tags, capacity, deadline */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {posting.tags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  <Tag className="size-2.5 mr-0.5" />
                  {tag}
                </Badge>
              ))}
              {posting.capacity > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="size-3" />
                  0/{posting.capacity}
                </span>
              )}
              {posting.deadline && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {new Date(posting.deadline).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* Status badge */}
            <div className="flex items-center gap-2">
              <Badge variant={statusVariant[posting.status]}>
                {posting.status.charAt(0).toUpperCase() +
                  posting.status.slice(1)}
              </Badge>
            </div>

            {/* Join button */}
            {showJoinButton && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => setJoinDialogOpen(true)}
              >
                {posting.auto_accept
                  ? labels.spaces.posting.join
                  : labels.spaces.posting.requestToJoin}
              </Button>
            )}

            {/* Owner/admin controls */}
            {showControls && posting.status === "open" && (
              <div className="flex items-center gap-1 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleStatusChange("closed")}
                  aria-label="Close posting"
                >
                  <XCircle className="size-3" />
                  Close
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => handleStatusChange("filled")}
                  aria-label="Mark as filled"
                >
                  <CheckCircle2 className="size-3" />
                  Filled
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1"
                  onClick={() => setEditDialogOpen(true)}
                  aria-label="Edit posting"
                >
                  <Pencil className="size-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-destructive"
                  onClick={handleDelete}
                  aria-label="Delete posting"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Join request dialog */}
      <JoinRequestDialog
        postingId={posting.id}
        postingTitle={posting.text}
        autoAccept={posting.auto_accept}
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
      />

      {/* Edit dialog */}
      {spaceId && (
        <PostingEditDialog
          posting={posting}
          spaceId={spaceId}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
        />
      )}
    </>
  );
}
