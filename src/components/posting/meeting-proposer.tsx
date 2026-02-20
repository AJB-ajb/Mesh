"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labels } from "@/lib/labels";
import { SCHEDULING } from "@/lib/constants";

type MeetingProposerProps = {
  onPropose: (data: {
    title?: string;
    startTime: string;
    endTime: string;
  }) => Promise<void>;
  prefill?: { startTime: string; duration: number } | null;
  onClear?: () => void;
};

export function MeetingProposer({
  onPropose,
  prefill,
  onClear,
}: MeetingProposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState<number>(
    SCHEDULING.DEFAULT_DURATION_MINUTES,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    queueMicrotask(() => {
      setIsOpen(true);
      setStartTime(prefill.startTime);
      const closest = SCHEDULING.DURATION_OPTIONS.reduce((prev, curr) =>
        Math.abs(curr - prefill.duration) < Math.abs(prev - prefill.duration)
          ? curr
          : prev,
      );
      setDuration(closest);
    });
  }, [prefill]);

  const handleSubmit = async () => {
    if (!startTime) return;

    setIsSubmitting(true);
    try {
      const start = new Date(startTime);
      const end = new Date(start.getTime() + duration * 60 * 1000);

      await onPropose({
        title: title.trim() || undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });

      // Reset form
      setTitle("");
      setStartTime("");
      setDuration(SCHEDULING.DEFAULT_DURATION_MINUTES);
      setIsOpen(false);
      onClear?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        {labels.scheduling.proposeButton}
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <Input
        type="text"
        placeholder={labels.scheduling.titlePlaceholder}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground">
            {labels.scheduling.startLabel}
          </label>
          <Input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">
            {labels.scheduling.durationLabel}
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {SCHEDULING.DURATION_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d < 60 ? `${d} min` : `${d / 60}h`}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!startTime || isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="mr-1.5 h-3.5 w-3.5" />
          )}
          {labels.scheduling.proposeButton}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsOpen(false);
            onClear?.();
          }}
          disabled={isSubmitting}
        >
          {labels.common.cancel}
        </Button>
      </div>
    </div>
  );
}
