"use client";

import { useState } from "react";
import { Loader2, MoreHorizontal, Trash2, Share2, Flag, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { labels } from "@/lib/labels";
import { useSharePosting } from "@/lib/hooks/use-share-posting";
import { usePostingCoreContext } from "./posting-core-context";
import { usePostingEditContext } from "./posting-edit-context";
import { ExtendDeadlineButtons } from "./extend-deadline-buttons";

const isExpired = (expiresAt: string | null) => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

export function OwnerActions() {
  const { posting } = usePostingCoreContext();
  const {
    isDeleting,
    isExtending,
    isReposting,
    onDelete,
    onExtendDeadline,
    onRepost,
  } = usePostingEditContext();

  const { handleShare } = useSharePosting(posting.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const expired = isExpired(posting.expires_at);

  return (
    <div className="flex items-center gap-2">
      {expired && (
        <ExtendDeadlineButtons
          isExtending={isExtending}
          onExtend={onExtendDeadline}
        />
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={labels.ownerActions.menuLabel}
          >
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleShare}>
            <Share2 className="size-4" />
            {labels.postingDetail.sharePosting}
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Flag className="size-4" />
            {labels.postingDetail.reportIssue}
          </DropdownMenuItem>

          {expired && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onRepost}
                disabled={isReposting}
              >
                {isReposting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <RefreshCw className="size-4" />
                )}
                {labels.common.repost}
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {labels.ownerActions.deletePosting}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {labels.ownerActions.deleteTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {labels.postingDetail.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{labels.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteDialog(false);
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {labels.ownerActions.deleteConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
