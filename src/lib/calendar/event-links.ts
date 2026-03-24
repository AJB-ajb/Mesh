/**
 * Client-safe utilities for generating "Add to Calendar" links and ICS files.
 * No server dependencies — works entirely in the browser.
 */

export interface CalendarEventParams {
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}

/** Format a Date as YYYYMMDDTHHmmssZ (compact UTC). */
function toCompactUtc(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Format a Date as ISO 8601 for Outlook URLs. */
function toOutlookDateFormat(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "+00:00");
}

/** Escape text for ICS format (RFC 5545 §3.3.11). */
function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * Fold an ICS content line to comply with RFC 5545 §3.1 (max 75 octets).
 * Long lines are split by inserting CRLF + space.
 */
function foldIcsLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    // Continuation lines start with a space, so effective max is 74 chars of content
    parts.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return parts.join("\r\n");
}

/**
 * Build a Google Calendar "create event" URL.
 * Opens Google Calendar with a pre-filled event draft.
 */
export function buildGoogleCalendarUrl(event: CalendarEventParams): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toCompactUtc(event.start)}/${toCompactUtc(event.end)}`,
  });
  if (event.location) params.set("location", event.location);
  if (event.description) params.set("details", event.description);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Build an Outlook.com "create event" URL.
 * Opens Outlook web calendar with a pre-filled event draft.
 */
export function buildOutlookCalendarUrl(event: CalendarEventParams): string {
  const params = new URLSearchParams({
    rru: "addevent",
    subject: event.title,
    startdt: toOutlookDateFormat(event.start),
    enddt: toOutlookDateFormat(event.end),
  });
  if (event.location) params.set("location", event.location);
  if (event.description) params.set("body", event.description);

  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

/**
 * Generate an ICS file as a Blob (RFC 5545 compliant).
 * Works with all calendar apps: Apple Calendar, Google, Outlook desktop, Thunderbird, etc.
 */
export function generateIcsBlob(event: CalendarEventParams): Blob {
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@mesh`;
  const now = toCompactUtc(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mesh//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toCompactUtc(event.start)}`,
    `DTEND:${toCompactUtc(event.end)}`,
    foldIcsLine(`SUMMARY:${escapeIcs(event.title)}`),
  ];

  if (event.description) {
    lines.push(foldIcsLine(`DESCRIPTION:${escapeIcs(event.description)}`));
  }
  if (event.location) {
    lines.push(foldIcsLine(`LOCATION:${escapeIcs(event.location)}`));
  }

  lines.push("END:VEVENT", "END:VCALENDAR");

  // Trailing CRLF required by RFC 5545 §3.1
  return new Blob([lines.join("\r\n") + "\r\n"], {
    type: "text/calendar;charset=utf-8",
  });
}

/** Trigger a download of an ICS blob. */
export function downloadIcs(event: CalendarEventParams): void {
  const blob = generateIcsBlob(event);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const sanitized = event.title
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  a.download = `${sanitized || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
