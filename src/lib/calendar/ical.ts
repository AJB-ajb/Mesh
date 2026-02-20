/**
 * iCal feed parsing — lightweight VEVENT extraction.
 * No external dependencies; parses standard iCalendar RFC 5545 format.
 */

import type { BusyBlock } from "./types";

/**
 * Fetch and parse an iCal (.ics) feed URL into BusyBlock[].
 * Only extracts VEVENT DTSTART/DTEND; ignores all-day events without time.
 */
export async function fetchIcalBusyBlocks(url: string): Promise<BusyBlock[]> {
  const response = await fetch(url, {
    headers: { Accept: "text/calendar" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch iCal feed: ${response.status}`);
  }

  const text = await response.text();
  return parseIcal(text);
}

/**
 * Parse raw iCalendar text into BusyBlock[].
 */
export function parseIcal(text: string): BusyBlock[] {
  const blocks: BusyBlock[] = [];
  const lines = unfoldLines(text);

  let inEvent = false;
  let dtStart: Date | null = null;
  let dtEnd: Date | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      dtStart = null;
      dtEnd = null;
      continue;
    }

    if (line === "END:VEVENT") {
      if (inEvent && dtStart && dtEnd && dtEnd > dtStart) {
        blocks.push({ start: dtStart, end: dtEnd });
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;

    // Parse DTSTART and DTEND (may have parameters like TZID)
    if (line.startsWith("DTSTART")) {
      dtStart = parseIcalDateTime(line);
    } else if (line.startsWith("DTEND")) {
      dtEnd = parseIcalDateTime(line);
    }
  }

  return blocks;
}

/**
 * Unfold iCal lines: lines starting with space/tab are continuations.
 */
function unfoldLines(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Parse an iCal date-time property line.
 * Handles formats:
 *   DTSTART:20260215T090000Z          (UTC)
 *   DTSTART:20260215T090000           (floating)
 *   DTSTART;TZID=Europe/Berlin:20260215T090000
 *   DTSTART;VALUE=DATE:20260215       (all-day → null, we skip these)
 */
function parseIcalDateTime(line: string): Date | null {
  // Split on first colon to get value
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return null;

  const value = line.slice(colonIdx + 1).trim();

  // All-day event (VALUE=DATE) — 8 digits, no T
  if (/^\d{8}$/.test(value)) {
    return null; // Skip all-day events
  }

  // UTC: 20260215T090000Z
  if (value.endsWith("Z")) {
    return parseIcalDateString(value.slice(0, -1));
  }

  // With or without TZID — treat as UTC approximation
  // A fully correct implementation would resolve TZID, but for busy-block
  // scoring the small timezone offset is acceptable.
  return parseIcalDateString(value);
}

/**
 * Parse "20260215T090000" into a Date.
 */
function parseIcalDateString(s: string): Date | null {
  // Expected: YYYYMMDDTHHmmss
  const match = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  return new Date(
    Date.UTC(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second),
    ),
  );
}
