"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus, X, Clock, Loader2 } from "lucide-react";

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
import type { TimeProposalData } from "@/lib/supabase/types";

interface CreateTimeProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TimeProposalData) => void;
  suggestedSlots?: string[];
  isLoadingSlots?: boolean;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

export function CreateTimeProposalDialog({
  open,
  onOpenChange,
  onSubmit,
  suggestedSlots,
  isLoadingSlots,
}: CreateTimeProposalDialogProps) {
  const [title, setTitle] = useState("");
  const initialOptions = useMemo(() => {
    if (suggestedSlots && suggestedSlots.length > 0) {
      return suggestedSlots.length >= MIN_OPTIONS
        ? suggestedSlots
        : [
            ...suggestedSlots,
            ...Array(MIN_OPTIONS - suggestedSlots.length).fill(""),
          ];
    }
    return ["", ""];
  }, [suggestedSlots]);
  const [options, setOptions] = useState<string[]>(initialOptions);

  const handleAddOption = useCallback(() => {
    if (options.length < MAX_OPTIONS) {
      setOptions((prev) => [...prev, ""]);
    }
  }, [options.length]);

  const handleRemoveOption = useCallback(
    (index: number) => {
      if (options.length > MIN_OPTIONS) {
        setOptions((prev) => prev.filter((_, i) => i !== index));
      }
    },
    [options.length],
  );

  const handleOptionChange = useCallback((index: number, value: string) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  }, []);

  const validOptions = options.filter((o) => o.trim().length > 0);
  const canSubmit =
    title.trim().length > 0 && validOptions.length >= MIN_OPTIONS;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const proposalData: TimeProposalData = {
      title: title.trim(),
      options: validOptions.map((label) => ({
        label: label.trim(),
        votes: [],
      })),
      resolved_slot: null,
    };
    onSubmit(proposalData);
    setTitle("");
    setOptions(["", ""]);
    onOpenChange(false);
  }, [canSubmit, title, validOptions, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            {labels.cards.createTimeProposal}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <label
              htmlFor="proposal-title"
              className="text-sm font-medium mb-1.5 block"
            >
              {labels.cards.timeProposalTitle}
            </label>
            <Input
              id="proposal-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={labels.cards.timeProposalTitlePlaceholder}
              autoFocus
            />
          </div>

          {/* Time slots */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              {labels.cards.timeSlots}
            </label>

            {isLoadingSlots && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Loader2 className="size-3 animate-spin" />
                {labels.cards.loadingSlots}
              </div>
            )}

            <div className="space-y-2">
              {options.map((option, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={labels.cards.timeSlotPlaceholder}
                  />
                  {options.length > MIN_OPTIONS && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      onClick={() => handleRemoveOption(idx)}
                      aria-label={labels.cards.removeOption}
                    >
                      <X className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {options.length < MAX_OPTIONS && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 h-7 text-xs"
                onClick={handleAddOption}
              >
                <Plus className="size-3 mr-1" />
                {labels.cards.addOption}
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {labels.cards.cancel}
          </Button>
          <Button disabled={!canSubmit} onClick={handleSubmit}>
            {labels.cards.createTimeProposalSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
