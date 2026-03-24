"use client";

import { Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  downloadIcs,
  type CalendarEventParams,
} from "@/lib/calendar/event-links";

interface AddToCalendarProps {
  event: CalendarEventParams;
  className?: string;
}

/**
 * "Add to Calendar" dropdown with Google Calendar, Outlook, and .ics options.
 *
 * Desktop: links are primary (open in new tab), .ics is fallback.
 * Mobile: .ics works natively (opens device calendar app).
 */
export function AddToCalendar({ event, className }: AddToCalendarProps) {
  const googleUrl = buildGoogleCalendarUrl(event);
  const outlookUrl = buildOutlookCalendarUrl(event);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-7 text-xs ${className ?? ""}`}
        >
          <Calendar className="size-3 mr-1" />
          Add to calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem asChild>
          <a href={googleUrl} target="_blank" rel="noopener noreferrer">
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={outlookUrl} target="_blank" rel="noopener noreferrer">
            Outlook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => downloadIcs(event)}>
          <Download className="size-3 mr-1.5" />
          Download .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
