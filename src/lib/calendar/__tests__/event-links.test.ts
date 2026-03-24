import { describe, it, expect } from "vitest";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
  generateIcsBlob,
} from "../event-links";

const event = {
  title: "Friday Dinner",
  start: new Date("2026-03-27T19:00:00Z"),
  end: new Date("2026-03-27T21:00:00Z"),
  location: "Cafe Frühling",
  description: "Casual dinner",
};

describe("buildGoogleCalendarUrl", () => {
  it("returns a valid Google Calendar URL with encoded params", () => {
    const url = buildGoogleCalendarUrl(event);
    expect(url).toContain("calendar.google.com/calendar/render");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("text=Friday+Dinner");
    expect(url).toContain("dates=20260327T190000Z%2F20260327T210000Z");
    expect(url).toContain("location=Cafe");
    expect(url).toContain("details=Casual+dinner");
  });

  it("omits location and details when not provided", () => {
    const url = buildGoogleCalendarUrl({
      title: "Test",
      start: event.start,
      end: event.end,
    });
    expect(url).not.toContain("location=");
    expect(url).not.toContain("details=");
  });
});

describe("buildOutlookCalendarUrl", () => {
  it("returns a valid Outlook URL", () => {
    const url = buildOutlookCalendarUrl(event);
    expect(url).toContain("outlook.live.com/calendar");
    expect(url).toContain("subject=Friday+Dinner");
    expect(url).toContain("rru=addevent");
  });
});

/** Read blob content as text (works in jsdom where Blob.text() may not exist). */
async function blobToText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}

describe("generateIcsBlob", () => {
  it("produces a valid ICS blob", async () => {
    const blob = generateIcsBlob(event);
    expect(blob.type).toBe("text/calendar;charset=utf-8");

    const text = await blobToText(blob);
    expect(text).toContain("BEGIN:VCALENDAR");
    expect(text).toContain("BEGIN:VEVENT");
    expect(text).toContain("SUMMARY:Friday Dinner");
    expect(text).toContain("DTSTART:20260327T190000Z");
    expect(text).toContain("DTEND:20260327T210000Z");
    expect(text).toContain("DESCRIPTION:Casual dinner");
    expect(text).toContain("END:VEVENT");
    expect(text).toContain("END:VCALENDAR");
  });

  it("omits optional fields when not provided", async () => {
    const blob = generateIcsBlob({
      title: "Quick call",
      start: event.start,
      end: event.end,
    });
    const text = await blobToText(blob);
    expect(text).toContain("SUMMARY:Quick call");
    expect(text).not.toContain("LOCATION:");
    expect(text).not.toContain("DESCRIPTION:");
  });
});
