"use client";

import { useState } from "react";
import { Users, Clock, Tag } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stack } from "@/components/ui/stack";
import { Group } from "@/components/ui/group";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTimeAgoShort } from "@/lib/format";
import { labels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { SpacePosting, SpacePostingStatus } from "@/lib/supabase/types";
import { JoinRequestDialog } from "./join-request-dialog";

interface PostingCardInlineProps {
  posting: SpacePosting;
  creatorName: string;
  createdAt: string;
  isOwn: boolean;
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
}: PostingCardInlineProps) {
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  const showJoinButton = posting.status === "open" && !isOwn;

  return (
    <>
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <Card className="max-w-[85%] overflow-hidden py-0">
          <CardContent className="p-3">
            <Stack gap="sm">
              {/* Creator + time */}
              <Group gap="md" className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {creatorName}
                </span>
                <span>&middot;</span>
                <RelativeTime date={createdAt} formatter={formatTimeAgoShort} />
              </Group>

              {/* Posting text */}
              <p className="text-sm whitespace-pre-wrap break-words line-clamp-3">
                {posting.text}
              </p>

              {/* Meta row: tags, capacity, deadline */}
              <Group wrap gap="md" className="text-xs text-muted-foreground">
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
              </Group>

              {/* Status badge */}
              <Group gap="md">
                <Badge variant={statusVariant[posting.status]}>
                  {posting.status.charAt(0).toUpperCase() +
                    posting.status.slice(1)}
                </Badge>
              </Group>

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
            </Stack>
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
    </>
  );
}
