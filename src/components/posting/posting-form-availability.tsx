"use client";

import type {
  AvailabilityMode,
  RecurringWindow,
  SpecificWindow,
} from "@/lib/types/availability";
import { AvailabilityEditor } from "@/components/availability/availability-editor";
import { labels } from "@/lib/labels";

type PostingFormAvailabilityProps = {
  availabilityMode: AvailabilityMode;
  onModeChange: (mode: AvailabilityMode) => void;
  recurringWindows: RecurringWindow[];
  onRecurringWindowsChange: (windows: RecurringWindow[]) => void;
  specificWindows: SpecificWindow[];
  onSpecificWindowsChange: (windows: SpecificWindow[]) => void;
};

const MODES: { value: AvailabilityMode; label: string; description: string }[] =
  [
    {
      value: "flexible",
      label: labels.availability.modeFlexible,
      description: labels.availability.modeFlexibleDescription,
    },
    {
      value: "recurring",
      label: labels.availability.modeRecurring,
      description: labels.availability.modeRecurringDescription,
    },
    {
      value: "specific_dates",
      label: labels.availability.modeSpecificDates,
      description: labels.availability.modeSpecificDatesDescription,
    },
  ];

export function PostingFormAvailability({
  availabilityMode,
  onModeChange,
  recurringWindows,
  onRecurringWindowsChange,
}: PostingFormAvailabilityProps) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-2">
          {labels.availability.postingAvailabilityTitle}
        </p>
        <div className="flex flex-col gap-2">
          {MODES.map((mode) => (
            <label
              key={mode.value}
              className="flex items-start gap-3 cursor-pointer"
            >
              <input
                type="radio"
                name="availability_mode"
                value={mode.value}
                checked={availabilityMode === mode.value}
                onChange={() => onModeChange(mode.value)}
                className="mt-0.5"
              />
              <div>
                <span className="text-sm font-medium">{mode.label}</span>
                <p className="text-xs text-muted-foreground">
                  {mode.description}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Recurring editor */}
      {availabilityMode === "recurring" && (
        <AvailabilityEditor
          windows={recurringWindows}
          onChange={onRecurringWindowsChange}
        />
      )}

      {/* Specific dates — placeholder for future implementation */}
      {availabilityMode === "specific_dates" && (
        <p className="text-sm text-muted-foreground italic">
          {labels.availability.specificDatesComingSoon}
        </p>
      )}
    </div>
  );
}
