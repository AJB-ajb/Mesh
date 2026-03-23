"use client";

import { useState, useCallback } from "react";
import { Plus, X, BarChart3 } from "lucide-react";

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
import type { PollData } from "@/lib/supabase/types";

interface CreatePollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PollData) => void;
  suggestedQuestion?: string;
  suggestedOptions?: string[];
  isLoadingPrefill?: boolean;
}

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export function CreatePollDialog({
  open,
  onOpenChange,
  onSubmit,
  suggestedQuestion,
  suggestedOptions,
  isLoadingPrefill,
}: CreatePollDialogProps) {
  const [question, setQuestion] = useState(suggestedQuestion ?? "");
  const [options, setOptions] = useState(
    suggestedOptions && suggestedOptions.length >= MIN_OPTIONS
      ? suggestedOptions
      : ["", ""],
  );
  const [userTouched, setUserTouched] = useState(false);

  // Sync suggested props when they arrive after dialog is already open
  const [prevQuestion, setPrevQuestion] = useState(suggestedQuestion);
  if (suggestedQuestion !== prevQuestion) {
    setPrevQuestion(suggestedQuestion);
    if (suggestedQuestion && !userTouched) setQuestion(suggestedQuestion);
  }
  const [prevOptions, setPrevOptions] = useState(suggestedOptions);
  if (suggestedOptions !== prevOptions) {
    setPrevOptions(suggestedOptions);
    if (
      suggestedOptions &&
      suggestedOptions.length >= MIN_OPTIONS &&
      !userTouched
    ) {
      setOptions(suggestedOptions);
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

  const canSubmit =
    question.trim().length > 0 &&
    options.filter((o) => o.trim().length > 0).length >= MIN_OPTIONS;

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const pollData: PollData = {
      question: question.trim(),
      options: options
        .filter((o) => o.trim().length > 0)
        .map((label) => ({ label: label.trim(), votes: [] })),
    };
    onSubmit(pollData);
    // Reset
    setQuestion("");
    setOptions(["", ""]);
    onOpenChange(false);
  }, [canSubmit, question, options, onSubmit, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="size-4" />
            {labels.cards.createPoll}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Question */}
          <div>
            <label
              htmlFor="poll-question"
              className="text-sm font-medium mb-1.5 block"
            >
              {labels.cards.pollQuestion}
            </label>
            <Input
              id="poll-question"
              className={
                isLoadingPrefill && !userTouched ? "shimmer-input" : ""
              }
              onFocus={() => setUserTouched(true)}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={labels.cards.pollQuestionPlaceholder}
              autoFocus
            />
          </div>

          {/* Options */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              {labels.cards.pollOptions}
            </label>
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
                    placeholder={labels.cards.pollOptionPlaceholder(idx + 1)}
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
            {labels.cards.createPollSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
