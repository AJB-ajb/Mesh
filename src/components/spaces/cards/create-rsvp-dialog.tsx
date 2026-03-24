"use client";

import { useState, useCallback } from "react";
import { UserCheck } from "lucide-react";

import { labels } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { RsvpData } from "@/lib/supabase/types";
import { useSyncedSuggestion } from "@/lib/hooks/use-synced-suggestion";

interface CreateRsvpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: RsvpData) => void;
  suggestedTitle?: string;
  suggestedThreshold?: number;
  isLoadingPrefill?: boolean;
}

export function CreateRsvpDialog({
  open,
  onOpenChange,
  onSubmit,
  suggestedTitle,
  suggestedThreshold,
  isLoadingPrefill,
}: CreateRsvpDialogProps) {
  const [userTouched, setUserTouched] = useState(false);
  const [title, setTitle] = useSyncedSuggestion(
    suggestedTitle,
    userTouched,
    "",
  );
  const [threshold, setThreshold] = useSyncedSuggestion(
    suggestedThreshold,
    userTouched,
    2,
  );

  const canSubmit = title.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const rsvpData: RsvpData = {
      title: title.trim(),
      options: [
        { label: "Yes", votes: [] },
        { label: "No", votes: [] },
        { label: "Maybe", votes: [] },
      ],
      threshold,
    };
    onSubmit(rsvpData);
    setTitle("");
    setThreshold(2);
    onOpenChange(false);
  }, [
    canSubmit,
    title,
    threshold,
    onSubmit,
    onOpenChange,
    setTitle,
    setThreshold,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="size-4" />
            {labels.cards.createRsvp}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label
              htmlFor="rsvp-title"
              className="text-sm font-medium mb-1.5 block"
            >
              {labels.cards.rsvpTitle}
            </label>
            <Input
              id="rsvp-title"
              className={
                isLoadingPrefill && !userTouched ? "shimmer-input" : ""
              }
              onFocus={() => setUserTouched(true)}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={labels.cards.rsvpTitlePlaceholder}
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="rsvp-threshold"
              className="text-sm font-medium mb-1.5 block"
            >
              {labels.cards.rsvpThresholdLabel}
            </label>
            <Input
              id="rsvp-threshold"
              type="number"
              min={1}
              value={threshold}
              onChange={(e) =>
                setThreshold(Math.max(1, parseInt(e.target.value) || 1))
              }
              className={`w-24 ${isLoadingPrefill && !userTouched ? "shimmer-input" : ""}`}
              onFocus={() => setUserTouched(true)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {labels.cards.cancel}
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {labels.cards.createRsvpSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
