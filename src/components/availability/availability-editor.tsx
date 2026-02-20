"use client";

import { useState } from "react";
import type { RecurringWindow } from "@/lib/types/availability";
import type { AvailabilitySlots } from "@/lib/types/profile";
import {
  windowsToGrid,
  toggleGridSlot,
  windowsToGridWithPartial,
} from "@/lib/availability/quick-mode";
import { ProfileFormAvailability } from "@/components/profile/profile-form-availability";
import { CalendarWeekView } from "./calendar-week-view";
import { labels } from "@/lib/labels";

type AvailabilityEditorProps = {
  windows: RecurringWindow[];
  onChange: (windows: RecurringWindow[]) => void;
  readOnly?: boolean;
  busyBlocks?: RecurringWindow[];
};

type EditorMode = "quick" | "detailed";

export function AvailabilityEditor({
  windows,
  onChange,
  readOnly,
  busyBlocks,
}: AvailabilityEditorProps) {
  const [mode, setMode] = useState<EditorMode>("quick");

  if (readOnly) {
    // In read-only mode, show the calendar view
    return (
      <CalendarWeekView
        windows={windows}
        onChange={() => {}}
        readOnly
        busyBlocks={busyBlocks}
      />
    );
  }

  // Derive grid state from windows for quick mode
  const grid: AvailabilitySlots = windowsToGrid(windows);
  const partialGrid = windowsToGridWithPartial(windows);

  const handleToggleSlot = (day: string, slot: string) => {
    onChange(toggleGridSlot(windows, day, slot));
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("quick")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "quick"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {labels.availability.quickMode}
        </button>
        <button
          type="button"
          onClick={() => setMode("detailed")}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "detailed"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {labels.availability.detailedMode}
        </button>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground">
        {mode === "quick"
          ? labels.availability.quickModeHint
          : labels.availability.detailedModeHint}
      </p>

      {/* Editor */}
      {mode === "quick" ? (
        <ProfileFormAvailability
          availabilitySlots={grid}
          onToggleSlot={handleToggleSlot}
          partialGrid={partialGrid}
        />
      ) : (
        <CalendarWeekView
          windows={windows}
          onChange={onChange}
          busyBlocks={busyBlocks}
        />
      )}
    </div>
  );
}
