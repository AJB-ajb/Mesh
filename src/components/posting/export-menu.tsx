"use client";

import { Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { labels } from "@/lib/labels";
import type { MeetingProposal } from "@/lib/types/scheduling";

type ExportMenuProps = {
  proposal: MeetingProposal;
  postingId: string;
  postingTitle?: string;
};

function buildGoogleCalendarUrl(
  proposal: MeetingProposal,
  postingTitle?: string,
): string {
  const title = proposal.title
    ? `${proposal.title} — ${postingTitle ?? "Meeting"}`
    : (postingTitle ?? "Meeting");

  const start = new Date(proposal.start_time);
  const end = new Date(proposal.end_time);

  const formatGcal = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatGcal(start)}/${formatGcal(end)}`,
    details: `Team meeting for ${postingTitle ?? "posting"}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function ExportMenu({
  proposal,
  postingId,
  postingTitle,
}: ExportMenuProps) {
  const googleUrl = buildGoogleCalendarUrl(proposal, postingTitle);
  const icsUrl = `/api/postings/${postingId}/proposals/${proposal.id}/ics`;

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={googleUrl} target="_blank" rel="noopener noreferrer">
          <Calendar className="mr-1.5 h-3.5 w-3.5" />
          {labels.scheduling.exportGoogleCalendar}
        </a>
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={icsUrl} download>
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {labels.scheduling.exportIcs}
        </a>
      </Button>
    </div>
  );
}
