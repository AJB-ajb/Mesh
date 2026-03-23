"use client";

import { useState, useCallback } from "react";
import {
  Users,
  Clock,
  Pencil,
  Trash2,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { useSWRConfig } from "swr";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stack } from "@/components/ui/stack";
import { Group } from "@/components/ui/group";
import { ClientDate } from "@/components/ui/client-date";
import { RelativeTime } from "@/components/ui/relative-time";
import { formatTimeAgoShort } from "@/lib/format";
import { MarkdownRenderer } from "@/components/shared/markdown-renderer";
import { labels } from "@/lib/labels";
import { cacheKeys } from "@/lib/swr/keys";
import type {
  SpacePostingWithCreator,
  SpacePostingStatus,
} from "@/lib/supabase/types";
import { JoinRequestDialog } from "./join-request-dialog";
import { PostingEditDialog } from "./posting-edit-dialog";

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
  spaceId?: string;
  isAdmin?: boolean;
  revealHidden?: boolean;
}

export function PostingBrowserCard({
  posting,
  userId,
  spaceId,
  isAdmin,
  revealHidden = false,
}: PostingBrowserCardProps) {
  const { mutate } = useSWRConfig();
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const creatorName = posting.profiles?.full_name ?? "Unknown";
  const isOwn = userId === posting.created_by;
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
      <Stack gap="sm" className="rounded-lg border border-border bg-card p-4">
        {/* Text */}
        <MarkdownRenderer
          content={posting.text}
          className="text-sm"
          clamp={3}
          revealHidden={revealHidden}
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
        <Group gap="md" className="text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" />
            {posting.capacity}
          </span>
          {posting.deadline && (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              <ClientDate date={posting.deadline} />
            </span>
          )}
          <Badge
            variant={statusBadgeVariant(posting.status)}
            className="text-xs"
          >
            {posting.status}
          </Badge>
        </Group>

        {/* Footer: creator + join */}
        <Group justify="between" className="pt-1">
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
        </Group>

        {/* Owner/admin controls */}
        {showControls && posting.status === "open" && (
          <Group gap="sm" className="pt-1 border-t border-border">
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

      <JoinRequestDialog
        postingId={posting.id}
        postingTitle={posting.text}
        autoAccept={posting.auto_accept}
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
      />

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
