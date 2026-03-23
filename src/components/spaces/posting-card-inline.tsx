"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Clock,
  Tag,
  Pencil,
  Trash2,
  XCircle,
  CheckCircle2,
  MessageSquare,
  Globe,
} from "lucide-react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stack } from "@/components/ui/stack";
import { Group } from "@/components/ui/group";
import { ClientDate } from "@/components/ui/client-date";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTimeAgoShort } from "@/lib/format";
import { labels } from "@/lib/labels";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { cn } from "@/lib/utils";
import type { SpacePosting, SpacePostingStatus } from "@/lib/supabase/types";
import { GLOBAL_SPACE_ID } from "@/lib/supabase/types";
import { JoinRequestDialog } from "./join-request-dialog";
import { PostingEditDialog } from "./posting-edit-dialog";

interface PostingCardInlineProps {
  posting: SpacePosting;
  creatorName: string;
  createdAt: string;
  isOwn: boolean;
  revealHidden?: boolean;
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
  revealHidden,
}: PostingCardInlineProps) {
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [promoting, setPromoting] = useState(false);

  const showJoinButton = posting.status === "open" && !isOwn;
  const showControls = (isOwn || isAdmin) && spaceId;

  const invalidatePostings = useCallback(() => {
    if (spaceId) mutate(cacheKeys.spacePostings(spaceId));
  }, [spaceId, mutate]);

  const handleStatusChange = useCallback(
    async (status: string) => {
      if (!spaceId) return;
      const res = await fetch(`/api/spaces/${spaceId}/postings/${posting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        toast.error("Failed to update posting status");
        return;
      }
      invalidatePostings();
    },
    [spaceId, posting.id, invalidatePostings],
  );

  const handleDelete = useCallback(async () => {
    if (!spaceId) return;
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const { error } = await supabase
      .from("space_postings")
      .delete()
      .eq("id", posting.id);
    if (error) {
      toast.error("Failed to delete posting");
      return;
    }
    setConfirmingDelete(false);
    invalidatePostings();
  }, [spaceId, posting.id, invalidatePostings]);

  return (
    <>
      <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
        <Card className="max-w-[85%] overflow-hidden py-0">
          <CardContent className="p-3">
            <Stack gap="sm">
              {/* Creator + time */}
              <Group gap="sm" className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {creatorName}
                </span>
                <span>&middot;</span>
                <RelativeTime date={createdAt} formatter={formatTimeAgoShort} />
              </Group>

            {/* Posting text */}
            <MarkdownRenderer
              content={posting.text}
              className="text-sm"
              clamp={3}
              revealHidden={revealHidden}
            />

              {/* Meta row: tags, capacity, deadline */}
              <Group wrap gap="sm" className="text-xs text-muted-foreground">
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
                    <ClientDate date={posting.deadline} />
                  </span>
                )}
              </Group>

              {/* Status badge + thread link */}
              <Group gap="sm">
                <Badge variant={statusVariant[posting.status]}>
                  {posting.status.charAt(0).toUpperCase() +
                    posting.status.slice(1)}
                </Badge>
                {posting.sub_space_id && (
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={() =>
                      router.push(`/spaces/${posting.sub_space_id}`)
                    }
                  >
                    <MessageSquare className="size-3" />
                    {replyCount
                      ? labels.spaces.thread.replies(replyCount)
                      : labels.spaces.thread.viewThread}
                  </button>
                )}
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

              {/* Owner/admin controls */}
              {showControls && posting.status === "open" && (
                <Group gap="sm" wrap className="pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleStatusChange("closed")}
                    aria-label={labels.spaces.posting.close}
                  >
                    <XCircle className="size-3" />
                    {labels.spaces.posting.close}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleStatusChange("filled")}
                    aria-label={labels.spaces.posting.filled}
                  >
                    <CheckCircle2 className="size-3" />
                    {labels.spaces.posting.filled}
                  </Button>
                  {spaceId !== GLOBAL_SPACE_ID && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1"
                      disabled={promoting}
                      onClick={async () => {
                        setPromoting(true);
                        try {
                          const res = await fetch(
                            `/api/spaces/${spaceId}/postings/${posting.id}/promote`,
                            { method: "POST" },
                          );
                          if (res.ok) {
                            toast.success(labels.spaces.posting.promoteSuccess);
                          } else {
                            const data = await res.json().catch(() => null);
                            toast.error(
                              data?.error?.message ?? "Failed to promote",
                            );
                          }
                        } finally {
                          setPromoting(false);
                        }
                      }}
                    >
                      <Globe className="size-3" />
                      {labels.spaces.posting.promote}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1"
                    onClick={() => setEditDialogOpen(true)}
                    aria-label={labels.spaces.posting.editPosting}
                  >
                    <Pencil className="size-3" />
                  </Button>
                  {confirmingDelete ? (
                    <>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={handleDelete}
                      >
                        {labels.activity.actions.confirm}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setConfirmingDelete(false)}
                      >
                        {labels.spaces.posting.cancel}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs gap-1 text-destructive"
                      onClick={() => setConfirmingDelete(true)}
                      aria-label={labels.spaces.posting.deletePosting}
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </Group>
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
