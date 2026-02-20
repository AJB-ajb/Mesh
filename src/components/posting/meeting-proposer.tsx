"use client";

import { useState } from "react";
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
};

export function MeetingProposer({ onPropose }: MeetingProposerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState<number>(
    SCHEDULING.DEFAULT_DURATION_MINUTES,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          onClick={() => setIsOpen(false)}
          disabled={isSubmitting}
        >
          {labels.common.cancel}
        </Button>
      </div>
    </div>
  );
}
