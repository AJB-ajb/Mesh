"use client";

import {
  type AvailabilitySlots,
  DAYS,
  DAY_LABELS,
  TIME_SLOTS,
  TIME_SLOT_LABELS,
} from "@/lib/types/profile";

type ProfileFormAvailabilityProps = {
  availabilitySlots: AvailabilitySlots;
  onToggleSlot: (day: string, slot: string) => void;
};

export function ProfileFormAvailability({
  availabilitySlots,
  onToggleSlot,
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
                {TIME_SLOT_LABELS[slot]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <tr key={day}>
              <td className="p-2 font-medium">{DAY_LABELS[day]}</td>
              {TIME_SLOTS.map((slot) => {
                const active = (availabilitySlots[day] ?? []).includes(slot);
                return (
                  <td key={slot} className="p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleSlot(day, slot)}
                      className={`h-8 w-full rounded-md border transition-colors ${
                        active
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border bg-background hover:bg-muted"
                      }`}
                      aria-label={`${DAY_LABELS[day]} ${TIME_SLOT_LABELS[slot]}`}
                      aria-pressed={active}
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
