"use client";

import { useState, useCallback } from "react";
import { MessageSquarePlus, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { labels } from "@/lib/labels";
import type { FeedbackMood } from "@/lib/supabase/types";

const MOOD_EMOJIS: Record<FeedbackMood, string> = {
  frustrated: "\u{1F614}",
  neutral: "\u{1F610}",
  happy: "\u{1F60A}",
};

const MOOD_VALUES: FeedbackMood[] = ["frustrated", "neutral", "happy"];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState<FeedbackMood | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setMessage("");
    setMood(null);
    setError(null);
    setSuccess(false);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        // Reset form when closing
        resetForm();
      }
    },
    [resetForm],
  );

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) {
      setError(labels.feedback.errorEmptyMessage);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.trim(),
          mood,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        setError(labels.feedback.errorGeneric);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 2000);
    } catch {
      setError(labels.feedback.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }, [message, mood, resetForm]);

  const handleTranscription = useCallback((text: string) => {
    setMessage((prev) => (prev ? `${prev} ${text}` : text));
  }, []);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed right-4 bottom-4 z-50 size-12 rounded-full shadow-lg"
          aria-label={labels.feedback.buttonAriaLabel}
        >
          <MessageSquarePlus className="size-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{labels.feedback.sheetTitle}</SheetTitle>
          <SheetDescription>
            {labels.feedback.sheetDescription}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4">
          {success ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                <Check className="size-6" />
              </div>
              <p className="text-sm font-medium">
                {labels.feedback.successMessage}
              </p>
            </div>
          ) : (
            <>
              {/* Mood selector */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">
                  {labels.feedback.moodLabel}
                </label>
                <div className="flex gap-2">
                  {MOOD_VALUES.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(mood === m ? null : m)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-4 py-2 text-sm transition-colors ${
                        mood === m
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      aria-pressed={mood === m}
                    >
                      <span className="text-xl">{MOOD_EMOJIS[m]}</span>
                      <span className="text-muted-foreground text-xs">
                        {labels.feedback.moods[m]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message textarea */}
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={labels.feedback.messagePlaceholder}
                className="min-h-32 resize-none"
                enableMic
                onTranscriptionChange={handleTranscription}
                disabled={submitting}
              />

              {/* Error message */}
              {error && <p className="text-destructive text-sm">{error}</p>}

              {/* Submit button */}
              <Button
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
              >
                {submitting
                  ? labels.feedback.submittingButton
                  : labels.feedback.submitButton}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
