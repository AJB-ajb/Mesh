"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarWeekView } from "@/components/availability/calendar-week-view";
import { labels } from "@/lib/labels";
import type { CommonAvailabilityWindow } from "@/lib/types/scheduling";
import type { RecurringWindow } from "@/lib/types/availability";

type TeamAvailabilityViewProps = {
  windows: CommonAvailabilityWindow[];
  onTimeSelect?: (
    day: number,
    startMinutes: number,
    endMinutes: number,
  ) => void;
  timeSelection?: RecurringWindow | null;
};

/**
 * Invert available windows into unavailable windows.
 * The RPC returns when the team IS available; CalendarWeekView renders blocks
 * in red (destructive). We need to show UNavailable time as red, so we compute
 * the complement of each day's available windows within 0–1440 minutes.
 */
function invertWindows(
  available: CommonAvailabilityWindow[],
): RecurringWindow[] {
  const unavailable: RecurringWindow[] = [];

  for (let day = 0; day <= 6; day++) {
    const dayWindows = available
      .filter((w) => w.day_of_week === day)
      .sort((a, b) => a.start_minutes - b.start_minutes);

    let cursor = 0;
    for (const w of dayWindows) {
      if (w.start_minutes > cursor) {
        unavailable.push({
          window_type: "recurring",
          day_of_week: day,
          start_minutes: cursor,
          end_minutes: w.start_minutes,
        });
      }
      cursor = Math.max(cursor, w.end_minutes);
    }
    if (cursor < 1440) {
      unavailable.push({
        window_type: "recurring",
        day_of_week: day,
        start_minutes: cursor,
        end_minutes: 1440,
      });
    }
  }

  return unavailable;
}

export function TeamAvailabilityView({
  windows,
  onTimeSelect,
  timeSelection,
}: TeamAvailabilityViewProps) {
  if (windows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {labels.scheduling.commonAvailabilityTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {labels.scheduling.noCommonSlots}
          </p>
        </CardContent>
      </Card>
    );
  }

  const unavailableWindows = invertWindows(windows);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {labels.scheduling.commonAvailabilityTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CalendarWeekView
          windows={unavailableWindows}
          onChange={() => {}}
          readOnly
          onTimeSelect={onTimeSelect}
          timeSelection={timeSelection}
        />
        {onTimeSelect && (
          <p className="mt-2 text-xs text-muted-foreground">
            {labels.scheduling.dragToSelectHint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
