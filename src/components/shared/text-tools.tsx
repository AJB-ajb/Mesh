"use client";

import { useState } from "react";
import { Sparkles, Eraser, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TextDiffModal } from "@/components/shared/text-diff-modal";
import { labels } from "@/lib/labels";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TextToolsProps {
  text: string;
  onTextChange: (newText: string) => void;
  disabled?: boolean;
}

interface DiffModalState {
  open: boolean;
  original: string;
  proposed: string;
  title: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TextTools({ text, onTextChange, disabled }: TextToolsProps) {
  const [isFormatting, setIsFormatting] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [diffModal, setDiffModal] = useState<DiffModalState | null>(null);

  const isBusy = isFormatting || isCleaning;
  const isEmpty = !text.trim();

  const handleFormat = async () => {
    setError(null);
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

      setDiffModal({
        open: true,
        original: text,
        proposed: data.formatted,
        title: labels.textTools.formatTitle,
      });
    } catch {
      setError(labels.textTools.errorFormat);
    } finally {
      setIsFormatting(false);
    }
  };

  const handleClean = async () => {
    setError(null);
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

      setDiffModal({
        open: true,
        original: text,
        proposed: data.cleaned,
        title: labels.textTools.cleanTitle,
      });
    } catch {
      setError(labels.textTools.errorClean);
    } finally {
      setIsCleaning(false);
    }
  };

  const handleAccept = () => {
    if (diffModal) {
      onTextChange(diffModal.proposed);
      setDiffModal(null);
    }
  };

  const handleCloseModal = () => {
    setDiffModal(null);
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
      </div>

      {error && (
        <p className="text-xs text-muted-foreground text-right mt-1">{error}</p>
      )}

      {diffModal && (
        <TextDiffModal
          open={diffModal.open}
          onClose={handleCloseModal}
          onAccept={handleAccept}
          original={diffModal.original}
          proposed={diffModal.proposed}
          title={diffModal.title}
        />
      )}
    </>
  );
}
