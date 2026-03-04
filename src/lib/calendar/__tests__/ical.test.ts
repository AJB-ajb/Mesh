import { describe, it, expect } from "vitest";
import { parseIcal } from "../ical";

describe("calendar/ical", () => {
  it("parses a simple VEVENT with UTC times", () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:20260215T090000Z
DTEND:20260215T100000Z
SUMMARY:Team standup
END:VEVENT
END:VCALENDAR`;

    const blocks = parseIcal(ics);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toEqual(new Date("2026-02-15T09:00:00Z"));
    expect(blocks[0].end).toEqual(new Date("2026-02-15T10:00:00Z"));
  });

  it("parses multiple events", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260215T090000Z
DTEND:20260215T100000Z
END:VEVENT
BEGIN:VEVENT
DTSTART:20260216T140000Z
DTEND:20260216T150000Z
END:VEVENT
END:VCALENDAR`;

    const blocks = parseIcal(ics);
    expect(blocks).toHaveLength(2);
    expect(blocks[1].start).toEqual(new Date("2026-02-16T14:00:00Z"));
  });

  it("skips all-day events (VALUE=DATE)", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260215
DTEND;VALUE=DATE:20260216
END:VEVENT
END:VCALENDAR`;

    const blocks = parseIcal(ics);
    expect(blocks).toHaveLength(0);
  });

  it("handles CRLF line endings", () => {
    const ics =
      "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART:20260215T090000Z\r\nDTEND:20260215T100000Z\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n";

    const blocks = parseIcal(ics);
    expect(blocks).toHaveLength(1);
  });

  it("handles folded lines (continuation with space)", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260215T09
 0000Z
DTEND:20260215T100000Z
END:VEVENT
END:VCALENDAR`;

    const blocks = parseIcal(ics);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].start).toEqual(new Date("2026-02-15T09:00:00Z"));
  });

  it("parses DTSTART with TZID parameter (CET winter)", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=Europe/Berlin:20260215T090000
DTEND;TZID=Europe/Berlin:20260215T100000
END:VEVENT
END:VCALENDAR`;

    const blocks = parseIcal(ics);
    expect(blocks).toHaveLength(1);
    // Feb = CET (UTC+1), so 09:00 Berlin = 08:00 UTC
    expect(blocks[0].start).toEqual(new Date("2026-02-15T08:00:00Z"));
    expect(blocks[0].end).toEqual(new Date("2026-02-15T09:00:00Z"));
  });

  it("parses DTSTART with TZID parameter (CEST summer)", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=Europe/Berlin:20260715T140000
DTEND;TZID=Europe/Berlin:20260715T150000
END:VEVENT
END:VCALENDAR`;

    const blocks = parseIcal(ics);
    expect(blocks).toHaveLength(1);
    // Jul = CEST (UTC+2), so 14:00 Berlin = 12:00 UTC
    expect(blocks[0].start).toEqual(new Date("2026-07-15T12:00:00Z"));
    expect(blocks[0].end).toEqual(new Date("2026-07-15T13:00:00Z"));
  });

  it("parses DTSTART with US timezone TZID", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART;TZID=America/New_York:20260115T090000
DTEND;TZID=America/New_York:20260115T100000
END:VEVENT
END:VCALENDAR`;

    const blocks = parseIcal(ics);
    expect(blocks).toHaveLength(1);
    // Jan = EST (UTC-5), so 09:00 NY = 14:00 UTC
    expect(blocks[0].start).toEqual(new Date("2026-01-15T14:00:00Z"));
    expect(blocks[0].end).toEqual(new Date("2026-01-15T15:00:00Z"));
  });

  it("skips events where end <= start", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260215T100000Z
DTEND:20260215T090000Z
END:VEVENT
END:VCALENDAR`;

    const blocks = parseIcal(ics);
    expect(blocks).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    expect(parseIcal("")).toHaveLength(0);
  });

  it("skips events missing DTEND", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260215T090000Z
SUMMARY:No end time
END:VEVENT
END:VCALENDAR`;

    const blocks = parseIcal(ics);
    expect(blocks).toHaveLength(0);
  });
});
