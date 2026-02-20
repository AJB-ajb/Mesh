"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarWeekView } from "@/components/availability/calendar-week-view";
import { labels } from "@/lib/labels";
import type { CommonAvailabilityWindow } from "@/lib/types/scheduling";
import type { RecurringWindow } from "@/lib/types/availability";

type TeamAvailabilityViewProps = {
  windows: CommonAvailabilityWindow[];
};

/** Convert CommonAvailabilityWindow to RecurringWindow for CalendarWeekView */
function toRecurringWindows(
  windows: CommonAvailabilityWindow[],
): RecurringWindow[] {
  return windows.map((w) => ({
    window_type: "recurring" as const,
    day_of_week: w.day_of_week,
    start_minutes: w.start_minutes,
    end_minutes: w.end_minutes,
  }));
}

export function TeamAvailabilityView({ windows }: TeamAvailabilityViewProps) {
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

  const recurringWindows = toRecurringWindows(windows);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {labels.scheduling.commonAvailabilityTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <CalendarWeekView
          windows={recurringWindows}
          onChange={() => {}}
          readOnly
        />
      </CardContent>
    </Card>
  );
}
