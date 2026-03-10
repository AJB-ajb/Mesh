"use client";

import { useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { labels } from "@/lib/labels";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { CalendarConnect } from "@/components/calendar/calendar-connect";
import type { RecurringWindow } from "@/lib/types/availability";

// ---------------------------------------------------------------------------
// Availability overlay
// ---------------------------------------------------------------------------

type AvailabilityOverlayProps = {
  windows: RecurringWindow[];
  busyBlocks?: RecurringWindow[];
  onChange: (windows: RecurringWindow[]) => void;
  onClose: () => void;
};

export function AvailabilityOverlay({
  windows,
  busyBlocks,
  onChange,
  onClose,
}: AvailabilityOverlayProps) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {labels.profileEditor.availabilityOverlayTitle}
          </DialogTitle>
        </DialogHeader>
        <AvailabilityEditor
          windows={windows}
          onChange={onChange}
          busyBlocks={busyBlocks}
        />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Calendar overlay
// ---------------------------------------------------------------------------

type CalendarOverlayProps = {
  onClose: () => void;
};

export function CalendarOverlay({ onClose }: CalendarOverlayProps) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{labels.profileEditor.calendarOverlayTitle}</DialogTitle>
        </DialogHeader>
        <CalendarConnect onError={() => {}} onSuccess={() => {}} />
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Update overlay (natural-language update)
// ---------------------------------------------------------------------------

type UpdateOverlayProps = {
  sourceText: string | null;
  currentFormState: Record<string, unknown>;
  onApplied: () => void;
  onClose: () => void;
};

export function UpdateOverlay({
  sourceText,
  currentFormState,
  onApplied,
  onClose,
}: UpdateOverlayProps) {
  const [instruction, setInstruction] = useState("");
  const [isApplying, setIsApplying] = useState(false);

  const handleApply = useCallback(async () => {
    if (!instruction.trim()) return;
    setIsApplying(true);
    try {
      const res = await fetch("/api/extract/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: sourceText ?? "",
          instruction: instruction.trim(),
          currentFormState,
        }),
      });
      if (res.ok) {
        onApplied();
        onClose();
      }
    } catch {
      // Error handling via parent
    } finally {
      setIsApplying(false);
    }
  }, [instruction, sourceText, currentFormState, onApplied, onClose]);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.profileEditor.updateOverlayTitle}</DialogTitle>
        </DialogHeader>
        <Textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={labels.profileEditor.updateOverlayPlaceholder}
          rows={3}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {labels.slashCommands.cancelButton}
          </Button>
          <Button
            onClick={handleApply}
            disabled={!instruction.trim() || isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {labels.profileEditor.updateOverlayApplying}
              </>
            ) : (
              labels.profileEditor.updateOverlayApply
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
