import { describe, it, expect, vi, afterEach } from "vitest";
import { formatDate, formatTimeAgo, getInitials } from "../format";

describe("formatDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Posted today' for today's date", () => {
    const now = new Date().toISOString();
    expect(formatDate(now)).toBe("Posted today");
  });

  it("returns 'Posted 1 day ago' for yesterday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T12:00:00Z"));
    expect(formatDate("2026-01-31T12:00:00Z")).toBe("Posted 1 day ago");
    vi.useRealTimers();
  });

  it("returns 'Posted N days ago' for older dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T12:00:00Z"));
    expect(formatDate("2026-01-25T12:00:00Z")).toBe("Posted 7 days ago");
    vi.useRealTimers();
  });
});

describe("formatTimeAgo", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Just now' for very recent dates", () => {
    const now = new Date().toISOString();
    expect(formatTimeAgo(now)).toBe("Just now");
  });

  it("returns minutes for < 60 min", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T12:30:00Z"));
    expect(formatTimeAgo("2026-02-01T12:05:00Z")).toBe("25 minutes ago");
    vi.useRealTimers();
  });

  it("returns singular minute", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T12:01:30Z"));
    expect(formatTimeAgo("2026-02-01T12:00:00Z")).toBe("1 minute ago");
    vi.useRealTimers();
  });

  it("returns hours for < 24 hours", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-01T15:00:00Z"));
    expect(formatTimeAgo("2026-02-01T12:00:00Z")).toBe("3 hours ago");
    vi.useRealTimers();
  });

  it("returns days for < 7 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-05T12:00:00Z"));
    expect(formatTimeAgo("2026-02-01T12:00:00Z")).toBe("4 days ago");
    vi.useRealTimers();
  });

  it("returns locale date string for >= 7 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-15T12:00:00Z"));
    const result = formatTimeAgo("2026-02-01T12:00:00Z");
    // Should be a locale date string, not a relative time
    expect(result).not.toContain("ago");
    expect(result).not.toContain("Just now");
    vi.useRealTimers();
  });
});

describe("getInitials", () => {
  it("returns 'U' for null name", () => {
    expect(getInitials(null)).toBe("U");
  });

  it("returns single initial for single name", () => {
    expect(getInitials("Alice")).toBe("A");
  });

  it("returns two initials for full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns at most two initials for long names", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("returns uppercase initials", () => {
    expect(getInitials("john doe")).toBe("JD");
  });
});
