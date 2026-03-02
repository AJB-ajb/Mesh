"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Eraser, Loader2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextToolsProps {
  text: string;
  onTextChange: (newText: string) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNDO_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TextTools({
  text,
  onTextChange,
  disabled,
}: TextToolsProps) {
  const [isFormatting, setIsFormatting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousText, setPreviousText] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isBusy = isFormatting || isCleaning;
  const isEmpty = !text.trim();

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const startUndoTimer = () => {
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    undoTimeoutRef.current = setTimeout(() => {
      setPreviousText(null);
      setFeedbackMessage(null);
    }, UNDO_TIMEOUT_MS);
  };

  const handleFormat = async () => {
    setError(null);
    setFeedbackMessage(null);
    setIsFormatting(true);

    try {
      const res = await fetch("/api/format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message ?? labels.textTools.errorFormat);
        return;
      }

      const data: { formatted: string } = await res.json();

      if (data.formatted === text) {
        setError(labels.textTools.noChanges);
        return;
      }

      const oldText = text;
      onTextChange(data.formatted);
      setPreviousText(oldText);
      setFeedbackMessage(labels.textTools.appliedFormat);
      startUndoTimer();
    } catch {
      setError(labels.textTools.errorFormat);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleClean = async () => {
    setError(null);
    setFeedbackMessage(null);
    setIsCleaning(true);

    try {
      const res = await fetch("/api/clean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error?.message ?? labels.textTools.errorClean);
        return;
      }

      const data: { cleaned: string } = await res.json();

      if (data.cleaned === text) {
        setError(labels.textTools.noChanges);
        return;
      }

      const oldText = text;
      onTextChange(data.cleaned);
      setPreviousText(oldText);
      setFeedbackMessage(labels.textTools.appliedClean);
      startUndoTimer();
    } catch {
      setError(labels.textTools.errorClean);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleUndo = () => {
    if (previousText !== null) {
      onTextChange(previousText);
      setPreviousText(null);
      setFeedbackMessage(null);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
        undoTimeoutRef.current = null;
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleFormat}
          disabled={disabled || isEmpty || isBusy}
          title={labels.textTools.formatTooltip}
          aria-label={labels.textTools.formatButton}
        >
          {isFormatting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="ml-1 text-xs">
            {isFormatting
              ? labels.textTools.formatting
              : labels.textTools.formatButton}
          </span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClean}
          disabled={disabled || isEmpty || isBusy}
          title={labels.textTools.cleanTooltip}
          aria-label={labels.textTools.cleanButton}
        >
          {isCleaning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eraser className="h-4 w-4" />
          )}
          <span className="ml-1 text-xs">
            {isCleaning
              ? labels.textTools.cleaning
              : labels.textTools.cleanButton}
          </span>
        </Button>

        {previousText !== null && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUndo}
            aria-label={labels.textTools.undoButton}
          >
            <Undo2 className="mr-1 h-4 w-4" />
            <span className="text-xs">{labels.textTools.undoButton}</span>
          </Button>
        )}
      </div>

      {feedbackMessage && (
        <p className="text-xs text-muted-foreground text-right mt-1">
          {feedbackMessage}
        </p>
      )}

      {error && (
        <p className="text-xs text-muted-foreground text-right mt-1">{error}</p>
      )}
    </>
  );
}
