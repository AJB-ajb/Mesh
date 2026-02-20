"use client";

import { Check, Loader2, Pencil, Trash2, RefreshCw } from "lucide-react";

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
import type { PostingDetail } from "@/lib/hooks/use-posting-detail";
import { ExtendDeadlineButtons } from "./extend-deadline-buttons";

const isExpired = (expiresAt: string | null) => {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
};

export type OwnerActionsProps = {
  posting: PostingDetail;
  isEditing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isExtending: boolean;
  isReposting: boolean;
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onDelete: () => void;
  onExtendDeadline: (days: number) => void;
  onRepost: () => void;
  hideEditButton?: boolean;
};

export function OwnerActions({
  posting,
  isEditing,
  isSaving,
  isDeleting,
  isExtending,
  isReposting,
  onSave,
  onCancelEdit,
  onStartEdit,
  onDelete,
  onExtendDeadline,
  onRepost,
  hideEditButton,
}: OwnerActionsProps) {
  if (isEditing) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {labels.postingDetail.saving}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {labels.common.save}
            </>
          )}
        </Button>
        <Button variant="outline" onClick={onCancelEdit}>
          {labels.common.cancel}
        </Button>
      </div>
    );
  }

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
        {!hideEditButton && (
          <Button variant="outline" onClick={onStartEdit}>
            <Pencil className="h-4 w-4" />
            {labels.common.edit}
          </Button>
        )}
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
