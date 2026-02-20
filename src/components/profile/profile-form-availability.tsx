"use client";

import {
  type AvailabilitySlots,
  DAYS,
  DAY_LABELS,
  TIME_SLOTS,
  TIME_SLOT_LABELS,
  TIME_SLOT_RANGE_LABELS,
} from "@/lib/types/profile";
import type { GridCellState } from "@/lib/availability/quick-mode";

type ProfileFormAvailabilityProps = {
  availabilitySlots: AvailabilitySlots;
  onToggleSlot: (day: string, slot: string) => void;
  partialGrid?: Record<string, Record<string, GridCellState>>;
};

function cellClassName(state: GridCellState): string {
  switch (state) {
    case "full":
      return "border-destructive/50 bg-destructive/15 text-destructive";
    case "partial":
      return "border-destructive/30 bg-[repeating-linear-gradient(45deg,transparent,transparent_3px,hsl(var(--destructive)/0.08)_3px,hsl(var(--destructive)/0.08)_6px)] text-destructive/60";
    default:
      return "border-border bg-background hover:bg-muted";
  }
}

export function ProfileFormAvailability({
  availabilitySlots,
  onToggleSlot,
  partialGrid,
}: ProfileFormAvailabilityProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left font-medium text-muted-foreground" />
            {TIME_SLOTS.map((slot) => (
              <th
                key={slot}
                className="p-2 text-center font-medium text-muted-foreground"
              >
                <div>{TIME_SLOT_LABELS[slot]}</div>
                <div className="text-[10px] font-normal">
                  {TIME_SLOT_RANGE_LABELS[slot]}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <tr key={day}>
              <td className="p-2 font-medium">{DAY_LABELS[day]}</td>
              {TIME_SLOTS.map((slot) => {
                const state: GridCellState =
                  partialGrid?.[day]?.[slot] ??
                  ((availabilitySlots[day] ?? []).includes(slot)
                    ? "full"
                    : "none");
                return (
                  <td key={slot} className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleSlot(day, slot)}
                      className={`h-8 w-full rounded-md border transition-colors ${cellClassName(state)}`}
                      aria-label={`${DAY_LABELS[day]} ${TIME_SLOT_LABELS[slot]}`}
                      aria-pressed={state !== "none"}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
