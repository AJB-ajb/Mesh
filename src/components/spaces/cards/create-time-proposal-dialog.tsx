"use client";

import { useState, useCallback } from "react";
import { Plus, X, Clock, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
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
import type { SuggestedSlot } from "@/lib/ai/card-suggest";

interface CreateTimeProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TimeProposalData, deadline?: string) => void;
  suggestedSlots?: string[];
  suggestedTitle?: string;
  structuredSlots?: SuggestedSlot[];
  durationMinutes?: number;
  memberNotes?: Record<string, string>;
  isLoadingSlots?: boolean;
  isLoadingPrefill?: boolean;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 8;

const DEADLINE_HOURS_MAP: Record<string, number> = {
  "2h": 2,
  "6h": 6,
  "12h": 12,
  "24h": 24,
  "48h": 48,
};

export function CreateTimeProposalDialog({
  open,
  onOpenChange,
  onSubmit,
  suggestedSlots,
  suggestedTitle,
  structuredSlots,
  durationMinutes,
  memberNotes,
  isLoadingSlots,
  isLoadingPrefill,
}: CreateTimeProposalDialogProps) {
  const [title, setTitle] = useState(suggestedTitle ?? "");
  const deriveOptions = (): string[] => {
    if (suggestedSlots && suggestedSlots.length > 0) {
      return suggestedSlots.length >= MIN_OPTIONS
        ? [...suggestedSlots]
        : [
            ...suggestedSlots,
            ...Array(MIN_OPTIONS - suggestedSlots.length).fill(""),
          ];
    }
    return ["", ""];
  };
  const [options, setOptions] = useState<string[]>(deriveOptions);
  const [userTouched, setUserTouched] = useState(false);
  const [deadlineKey, setDeadlineKey] = useState<string>("12h");
  const [quorum, setQuorum] = useState<string>("");

  // Sync suggested props when they arrive after dialog is already open
  const [prevSuggestedTitle, setPrevSuggestedTitle] = useState(suggestedTitle);
  if (suggestedTitle !== prevSuggestedTitle) {
    setPrevSuggestedTitle(suggestedTitle);
    if (suggestedTitle && !userTouched) setTitle(suggestedTitle);
  }
  const [prevSuggestedSlots, setPrevSuggestedSlots] = useState(suggestedSlots);
  if (suggestedSlots !== prevSuggestedSlots) {
    setPrevSuggestedSlots(suggestedSlots);
    if (suggestedSlots && suggestedSlots.length > 0 && !userTouched) {
      setOptions(
        suggestedSlots.length >= MIN_OPTIONS
          ? [...suggestedSlots]
          : [
              ...suggestedSlots,
              ...Array(MIN_OPTIONS - suggestedSlots.length).fill(""),
            ],
      );
    }
  }

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

    // Compute deadline ISO string
    const hours = DEADLINE_HOURS_MAP[deadlineKey] ?? 12;
    const deadlineISO = new Date(
      Date.now() + hours * 60 * 60 * 1000,
    ).toISOString();

    // Build slot_times from structuredSlots if available (parallel to options by index)
    const slotTimes = structuredSlots
      ? validOptions
          .map((label) => {
            const match = structuredSlots.find(
              (s) => s.label.trim() === label.trim(),
            );
            return match ? { start: match.start, end: match.end } : null;
          })
          .filter((s): s is { start: string; end: string } => s !== null)
      : null;

    const proposalData: TimeProposalData = {
      title: title.trim(),
      options: validOptions.map((label) => ({
        label: label.trim(),
        votes: [],
      })),
      resolved_slot: null,
      slot_times:
        slotTimes && slotTimes.length === validOptions.length
          ? slotTimes
          : null,
      duration_minutes: durationMinutes ?? null,
      member_notes: memberNotes ?? null,
      quorum: quorum ? parseInt(quorum, 10) : null,
    };
    onSubmit(proposalData, deadlineISO);
    setTitle("");
    setOptions(["", ""]);
    setDeadlineKey("12h");
    setQuorum("");
    onOpenChange(false);
  }, [
    canSubmit,
    title,
    validOptions,
    structuredSlots,
    durationMinutes,
    memberNotes,
    onSubmit,
    onOpenChange,
    deadlineKey,
    quorum,
  ]);

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
              className={
                isLoadingPrefill && !userTouched ? "shimmer-input" : ""
              }
              onFocus={() => setUserTouched(true)}
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
                    className={
                      isLoadingPrefill && !userTouched ? "shimmer-input" : ""
                    }
                    onFocus={() => setUserTouched(true)}
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

          {/* Deadline selector */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              {labels.cards.deadlineLabel}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(labels.cards.deadlineOptions).map(
                ([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDeadlineKey(key)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                      deadlineKey === key
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/50",
                    )}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>

          {/* Quorum */}
          <div>
            <label
              htmlFor="quorum"
              className="text-sm font-medium mb-1.5 block"
            >
              {labels.cards.quorumLabel}
            </label>
            <Input
              id="quorum"
              type="number"
              min={1}
              max={99}
              value={quorum}
              onChange={(e) => setQuorum(e.target.value)}
              placeholder={labels.cards.quorumPlaceholder}
              className="w-32"
            />
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
