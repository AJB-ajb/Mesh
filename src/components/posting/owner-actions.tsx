"use client";

import { Loader2, Trash2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { labels } from "@/lib/labels";
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
