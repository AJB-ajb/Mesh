"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SmartAcceptanceCard } from "./smart-acceptance-card";
import { labels } from "@/lib/labels";
import type { ApplicationResponses } from "@/lib/types/acceptance-card";

interface AcceptanceDialogProps {
  postingId: string | null; // null = closed
  onClose: () => void;
  onSubmit: (
    postingId: string,
    responses: ApplicationResponses,
  ) => Promise<void>;
}

export function AcceptanceDialog({
  postingId,
  onClose,
  onSubmit,
}: AcceptanceDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Clear error when a new posting is selected
  const prevPostingId = useState<string | null>(null);
  if (prevPostingId[0] !== postingId) {
    prevPostingId[1](postingId);
    if (error) setError(null);
  }

  const handleSubmit = useCallback(
    async (responses: ApplicationResponses) => {
      if (!postingId) return;
      setIsSubmitting(true);
      setError(null);
      try {
        await onSubmit(postingId, responses);
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to submit request",
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [postingId, onSubmit, onClose],
  );

  return (
    <Dialog
      open={!!postingId}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-5 pb-0">
          <DialogTitle>{labels.acceptanceCard.dialogTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            {labels.acceptanceCard.dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <div className="p-5 pt-3">
          {error && (
            <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {postingId && (
            <SmartAcceptanceCard
              key={postingId}
              postingId={postingId}
              onSubmit={handleSubmit}
              onCancel={onClose}
              isSubmitting={isSubmitting}
              embedded
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
